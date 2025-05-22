import requests
import json
import unicodedata
import re
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def normalizar_texto(texto):
    texto = texto.upper()
    texto = unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('utf-8')
    texto = re.sub(r'[^A-Z0-9 ]', '', texto)
    return re.sub(r'\s+', ' ', texto).strip()

def consulta_dnp_loc(provincia, municipio, codigo, via, numero):
    via = normalizar_texto(via)
    url = (
        "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/"
        f"Consulta_DNPLOC?Provincia={provincia}&Municipio={municipio}&Sigla={codigo}&Calle={via}&Numero={numero}"
    )
    logger.debug(f"🌐 URL DNPLOC: {url}")
    headers = {"User-Agent": "CatastroScript/1.0"}
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} en Consulta_DNPLOC")

    data = resp.json()
    # Primer intento: formato tradicional (bico.bi)
    bi = data.get("consulta_dnplocResult", {}).get("bico", {}).get("bi")
    if bi:
        if isinstance(bi, list):
            # Tomamos la primera referencia
            rc = bi[0].get("idbi", {}).get("rc", {})
        else:
            rc = bi.get("idbi", {}).get("rc", {})
        return rc.get("pc1", "") + rc.get("pc2", "")

    # Segundo intento: nuevo formato (lrcdnp.rcdnp)
    inmuebles = data.get("consulta_dnplocResult", {}).get("lrcdnp", {}).get("rcdnp", [])
    if inmuebles:
        rc = inmuebles[0].get("rc", {})
        return rc.get("pc1", "") + rc.get("pc2", "")

    return None

def consulta_dnprc(refcat_corta):
    url = (
        "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/"
        f"Consulta_DNPRC?RefCat={refcat_corta}"
    )
    logger.debug(f"🌐 URL DNPRC (corta): {url}")
    headers = {"User-Agent": "CatastroScript/1.0"}
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        raise Exception(f"Error {resp.status_code} en Consulta_DNPRC")

    return resp.json()

def extraer_datos(data):
    # Obtenemos todos los datos del objeto JSON retornado por el API de Catastro
    logger.debug("Procesando datos del catastro")
    
    # Intentamos extraer los datos de la estructura principal
    inmuebles = data.get("consulta_dnprcResult", {}).get("lrcdnp", {}).get("rcdnp", [])
    if not inmuebles and isinstance(inmuebles, dict):
        # Si inmuebles es un diccionario en lugar de una lista, lo convertimos en lista
        inmuebles = [inmuebles]
    
    # Si la estructura principal está vacía, intentamos la estructura alternativa
    if not inmuebles:
        bi = data.get("consulta_dnprcResult", {}).get("bico", {}).get("bi", {})
        if bi:
            if isinstance(bi, list):
                inmuebles = bi
            else:
                inmuebles = [bi]
    
    resultados = []
    logger.debug(f"Encontrados {len(inmuebles)} inmuebles para procesar")

    for inmueble in inmuebles:
        try:
            # Navegamos con seguridad en el árbol JSON
            # Si alguna ruta no existe, obtendremos un diccionario vacío en lugar de None
            rc = inmueble.get("rc", {}) or inmueble.get("idbi", {}).get("rc", {}) or {}
            dt = inmueble.get("dt", {}) or {}
            debi = inmueble.get("debi", {}) or {}
            
            # Si lourb no existe, intentar obtener datos de localización de ls (suelo)
            locs = dt.get("locs", {}) or {}
            lous = locs.get("lous", {}) or {}
            lourb = lous.get("lourb", {}) or {}
            loint = lourb.get("loint", {}) or {}
            dir_info = lourb.get("dir", {}) or {}
            
            # Construir la referencia catastral completa
            refcat = ""
            if "pc1" in rc and "pc2" in rc:
                refcat = rc.get("pc1", "") + rc.get("pc2", "")
                if "car" in rc and "cc1" in rc and "cc2" in rc:
                    refcat += rc.get("car", "") + rc.get("cc1", "") + rc.get("cc2", "")
            elif "rc" in inmueble:
                refcat = inmueble.get("rc")
            
            # Construir objeto con todos los datos disponibles
            datos = {
                "refcat": refcat,
                "tipo_via": dir_info.get("tv", ""),
                "nombre_via": dir_info.get("nv", ""),
                "numero": dir_info.get("pnp", ""),
                "bloque": loint.get("bq", ""),
                "escalera": loint.get("es", ""),
                "planta": loint.get("pt", ""),
                "puerta": loint.get("pu", ""),
                "cp": dir_info.get("dp", ""),
                "uso": debi.get("luso", ""),
                "superficie": debi.get("sfc", ""),
                "anio": debi.get("ant", ""),
                "clase": debi.get("cpt", "")
            }
            
            resultados.append(datos)
        except Exception as e:
            logger.error(f"Error procesando inmueble: {e}")
    
    logger.debug(f"Procesados {len(resultados)} inmuebles con éxito")
    return resultados
