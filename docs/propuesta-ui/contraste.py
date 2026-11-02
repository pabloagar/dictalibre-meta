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
}

if __name__ == '__main__':
    for nombre, (a, b) in PARES.items():
        r = razon(a, b)
        print(f'{nombre}: {r}:1 {"AA" if r >= 4.5 else "NO CUMPLE AA texto normal"}')
