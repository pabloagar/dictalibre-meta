"""Calcula la razón de contraste WCAG 2.x entre pares de colores hex.

Uso: python3 docs/propuesta-ui/contraste.py
Valores de diseño: no sustituyen la medición sobre colores computados en el navegador.
"""

def luminancia(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def razon(a, b):
    la, lb = sorted((luminancia(a), luminancia(b)), reverse=True)
    return round((la + 0.05) / (lb + 0.05), 2)


PARES = {
    'A lectura · texto / fondo': ('#d5dad6', '#1b1e1d'),
    'A lectura · texto-2 / fondo': ('#a3aca7', '#1b1e1d'),
    'A lectura · texto-3 / superficie': ('#8a948f', '#222625'),
    'A lectura · grabando / fondo': ('#e8665f', '#1b1e1d'),
    'A lectura · borrador / fondo': ('#9cc0e6', '#1b1e1d'),
    'A lectura · alerta / alerta-fondo': ('#f0a74e', '#3a2d1c'),
    'A día · texto / fondo': ('#1d2422', '#eceeed'),
    'A día · texto-3 / fondo': ('#5f6965', '#eceeed'),
    'A día · alerta / alerta-fondo': ('#8a4b00', '#f7ead8'),
    'A móvil · blanco / tecla roja': ('#ffffff', '#c7362f'),
    'B día · tinta / hoja': ('#1c2a2e', '#ffffff'),
    'B día · tinta-3 / mesa': ('#55646a', '#e4e8e7'),
    'B día · blanco / institucional': ('#ffffff', '#1d5a52'),
    'B día · alerta / alerta-suave': ('#8f4700', '#fcecd9'),
    'B sala · tinta / hoja': ('#d3d9d8', '#22272a'),
    'B sala · tinta-3 / mesa': ('#8e9899', '#171a1b'),
    'B sala · alerta / alerta-suave': ('#f2a65a', '#3a2c1d'),
    'B móvil sala · blanco / tecla roja': ('#ffffff', '#c4433b'),
    'Actual · --muted / --paper': ('#67766e', '#f5f4ee'),
    # Propuesta B v2.1 (2-nov-2026): sala predeterminada, grises cálidos, un color por significado.
    'B2 sala · tinta / hoja': ('#c8c4bb', '#1c1b19'),
    'B2 sala · tinta-2 / hoja': ('#99948a', '#1c1b19'),
    'B2 sala · tinta-3 / mesa': ('#8a857c', '#131211'),
    'B2 sala · tinta-3 / barra': ('#8a857c', '#181715'),
    'B2 sala · grabando / hoja': ('#d9705f', '#1c1b19'),
    'B2 sala · grabando / grabando-suave': ('#d9705f', '#2a1c19'),
    'B2 sala · alerta / hoja': ('#c99a4b', '#1c1b19'),
    'B2 sala · alerta / alerta-suave': ('#c99a4b', '#2a2418'),
    'B2 sala · acción final': ('#d8d4cb', '#34322d'),
    'B2 sala · tecla grabando': ('#f1ece4', '#7a3328'),
    'B2 sala · tecla grabando (detalle)': ('#e8ded3', '#7a3328'),
    'B2 sala · visor texto': ('#c8c4bb', '#100f0e'),
    'B2 sala · visor secundario': ('#8a857c', '#100f0e'),
    'B2 sala · visor grabando': ('#e8806f', '#100f0e'),
    'B2 sala · error en visor': ('#f6f4ef', '#7a3328'),
    'B2 día · tinta / hoja': ('#24221e', '#f6f4ef'),
    'B2 día · tinta-2 / hoja': ('#59544b', '#f6f4ef'),
    'B2 día · tinta-3 / mesa': ('#5f5a51', '#e6e2da'),
    'B2 día · grabando / hoja': ('#a8321f', '#f6f4ef'),
    'B2 día · grabando / grabando-suave': ('#a8321f', '#f3e0da'),
    'B2 día · alerta / hoja': ('#8a5a00', '#f6f4ef'),
    'B2 día · alerta / alerta-suave': ('#8a5a00', '#f1e6cf'),
    'B2 día · acción final': ('#f6f4ef', '#3a3732'),
    'B2 día · tecla grabando': ('#f1ece4', '#a8321f'),
    'B2 día · tecla grabando (detalle)': ('#e8ded3', '#a8321f'),
    'B2 día · visor texto': ('#ece8e0', '#24221e'),
    'B2 día · visor secundario': ('#a8a297', '#24221e'),
    'B2 día · visor grabando': ('#e8806f', '#24221e'),
    'B2 día · error en visor': ('#f6f4ef', '#8f2a1c'),
    'B2 día · error detalle': ('#eadbd3', '#8f2a1c'),
    'B2 página · muted / surface': ('#59544b', '#faf9f6'),
    'B2 página oscura · muted / bg': ('#99948a', '#131211'),
}

if __name__ == '__main__':
    for nombre, (a, b) in PARES.items():
        r = razon(a, b)
        print(f'{nombre}: {r}:1 {"AA" if r >= 4.5 else "NO CUMPLE AA texto normal"}')
