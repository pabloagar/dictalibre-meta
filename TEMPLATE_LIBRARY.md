# Biblioteca de plantillas · importación local

Colección aportada por el responsable desde PLANTILLAS GENERALES PUC, Escritorio. Importación completa: 603 archivos físicos y 354 miembros de ZIP inspeccionados. Se obtuvieron 285 textos únicos; 732 apariciones de texto idéntico agrupadas. 903 entradas de texto/Word procesadas producen 1017 secciones antes de deduplicar. 12 archivos temporales de Word y 40 referencias (38 PDF y 2 presentaciones) separados; 2 contenedores ZIP registrados. Ningún original modificado, comprobado por SHA-256.

## Uso
En el editor: buscar por estudio, región o frase (ignora acentos); filtrar por modalidad; elegir plantilla, consultar vista previa/procedencia y Crear informe. Marcar favorita y Solo favoritas facilitan acceso. El informe es una copia editable: no se altera el catálogo. Las plantillas propias siguen en el navegador y no incluyen copias de toda la biblioteca. Favoritas también por navegador.

## Importación reproducible
Ejecutar scripts/import-templates.py con carpeta fuente y directorio de salida. En esta máquina se usó Python del runtime de documentos, con pypdf ya disponible. No se instalaron paquetes. TXT UTF-8/BOM/UTF-16 y alternativa CP1252 señalada; DOCX leído como XML en orden de párrafos; ZIP inspeccionado en memoria sin extraer rutas al disco. PDF solo extracción local para clasificación; artículos no se convierten automáticamente en plantillas. No se ejecutan macros ni instrucciones de los documentos.

El catálogo y textos extraídos están en data/local/templates, fuera de Git. protocol.json registra versión/hash del importador e hipótesis antes de cada pasada; inventory.json incluye todos los archivos procesados, hash, estado, advertencias y tiempo. history conserva pasadas previas; attempt-01 conserva la primera exploración. catalog.json agrupa duplicados por hash del texto extraído exacto (incluye diferencias de espacios/saltos), mantiene todas las procedencias y variantes distintas. No se corrigió redacción clínica.

La separación usa títulos reconocibles y estructura del informe; cada división reconstruye el texto extraído concatenando sus partes. Casos ambiguos se conservan completos y se advierten, no se omiten. Categorías y separación automáticas necesitan revisión del profesional. No se certificó visualmente cada documento ni se preserva formato enriquecido, numeración automática o tablas complejas. Biblioteca no equivale a informe clínicamente validado. Nombres dañados por codificación se reparan solo para presentación cuando la conversión es reversible.

## Estado de activación
Implementación e importación listas y probadas en instancia aislada. El responsable pidió mantener la sesión de grabación activa; activación en el laboratorio principal pendiente de que termine/exporte y avise. No reiniciar durante sus pruebas. Tras activar: recargar /live y crear un QR si se perdió la conexión del receptor.
