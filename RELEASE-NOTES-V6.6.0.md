# Westbury Church Hub V6.6.0 — Actividades especiales

- Las tres plantillas **Funeral**, **Confraternidad Westbury** y **Campaña Westbury** aparecen **inactivas y sin fecha**; no se programan solas. Administradores pueden crear otras actividades, elegir fecha única editable o frecuencia, hora, lugar y dirección opcional, activar/desactivar, agregar posiciones usando ministerios existentes o crear nuevos.
- **Programa** distingue los servicios regulares de las **Actividades especiales** al final. Un evento especial se genera por separado mediante su botón y no se incluye en la tarea semanal automática.
- Los perfiles muestran también servicios especiales desactivados y retienen su elegibilidad al editarlos. La migración inicial habilita Funeral para los voluntarios de los ministerios equivalentes de Adoración dominical; la clase restringe los candidatos, en prioridad, a **Eduardo Ayala, Roberto Gonzalez, Luis Betanco**. Los otros dos eventos no inscriben voluntarios sin elección administrativa.
- Registro de cambios, validación estricta de horarios, recurrencias, posiciones y ministerios; rutas sujetas a permisos administrativos y CSRF existentes. Se reutilizan Smart Fair y la protección de asignaciones manuales y cantos elegidos. Al desactivar una actividad, sus programas futuros se cancelan y su elegibilidad permanece en los perfiles; al reactivar, el administrador puede generar nuevos programas. Las cancelaciones se auditan.

## Importante

Se entrega código y pruebas automatizadas; esta entrega no implica prueba de penetración ni despliegue en Azure. Revise en entorno de pruebas la migración de perfiles, los horarios reales y la programación antes de publicar. Nuevas actividades creadas o modificadas requieren configurar elegibilidad en los perfiles antes de generar.
