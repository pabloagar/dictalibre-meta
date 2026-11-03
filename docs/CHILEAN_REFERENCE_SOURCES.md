# Fuentes públicas y permisos de referencias chilenas

Revisión documental del 03-11-2026, a petición del responsable. No se descargaron nuevos audios, se clonaron voces ni se ejecutó entrenamiento. Ninguna de estas fuentes queda aprobada automáticamente como identidad comercial. Los estados describen evidencia disponible, no un dictamen jurídico.

| Fuente primaria | Evidencia | Decisión para este ciclo |
|---|---|---|
| [OpenSLR SLR71](https://openslr.org/71/) | Habla chilena transcrita por voluntarios; CC BY-SA 4.0. [Publicación de los autores](https://aclanthology.org/2020.lrec-1.801/) describe corpus construido para TTS. | Candidato documental prioritario para estudiar acento. Licencia y finalidad TTS verificadas; alcance de identidad, referencias de clonación y derivados comerciales pendiente de revisión. No entrenar ni clonar en este ciclo. |
| [Common Voice, términos](https://commonvoice.mozilla.org/oc/terms) | Texto, grabaciones y demás contribuciones bajo CC0; acceso actual mediante Mozilla Data Collective. | Verificar edición concreta, condiciones de descarga y metadatos Chile. No asumir que español implica chileno ni que CC0 resuelve identidad. No seleccionada una grabación específica. |
| [OHF voice-datasets](https://github.com/OHF-Voice/voice-datasets) y [Dave 1.0](https://mozilladatacollective.com/datasets/cmid4ir9100bgnu07du03svuc) | Dave: español, CC0, finalidad entrenamiento/ajuste TTS; ficha prohíbe intentar identificar al hablante. | Fuente de timbre potencial; procedencia/acento chileno no acreditado. No sirve como evidencia de acento chileno sin escucha. |
| [HABLA, depósito de autores](https://zenodo.org/records/7370805) | Contiene audio chileno real y artificial para antispoofing; identifica SLR71 como origen del habla chilena real. | No es una fuente independiente ni elimina permisos pendientes de SLR71. Evitar duplicación entre entrenamiento y evaluación. |

La búsqueda no encontró una grabación concreta que reúna todavía acento validado por nuestros oyentes y permisos completos para todas las finalidades del producto. Esto no prueba que no exista ni que su uso esté prohibido. Próximo paso: resolver el alcance de SLR71 o localizar una cesión pública explícita más completa, antes de usar una voz humana como referencia de síntesis.

Registro privado: `reference_candidates.json`, campos de fuente, hash de audio, finalidad, evidencia, evaluador y resultados. No inventar hashes de audio aún no descargado ni puntajes. Mantener evidencia de código/pesos separada de grabaciones e identidad. La voz del responsable no se utiliza.
