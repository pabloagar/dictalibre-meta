// Frozen preliminary vocabulary accepted for the MVP; recognition hints, never replacements.
export const MVP_KEYWORDS=Object.freeze(['neumotórax','hemotórax','hemitórax','esteatosis','aorta','litiasis','hipodensa','hiperdensa','hemorragia','hidrocefalia']);
export const COMMAND_KEYWORDS=Object.freeze(['punto','coma','dos puntos','nueva línea','nuevo párrafo','punto y coma']);
export const DEMO_KEYWORDS=Object.freeze([...MVP_KEYWORDS,...COMMAND_KEYWORDS]);
