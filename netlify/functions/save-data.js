// ============================================================
//  Netlify Function — save-data.js
//  Guarda data.js en GitHub de forma segura
//  El token vive en variables de entorno de Netlify (nunca expuesto)
// ============================================================

const GH_REPO   = 'lrgonzaleza/PS';
const GH_FILE   = 'data.js';
const GH_BRANCH = 'main';

exports.handler = async (event) => {

  // Solo aceptar POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Token desde variable de entorno de Netlify (nunca en el código)
  const GH_TOKEN = process.env.GH_TOKEN;
  if (!GH_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Token no configurado' }) };
  }

  try {
    const { data } = JSON.parse(event.body);
    if (!data) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No se recibió data' }) };
    }

    // Construir el contenido de data.js
    const content = `// ============================================================
//  PAPELI STUDIO — ARCHIVO DE CONFIGURACIÓN
//  Generado automáticamente por el panel admin
//  Última actualización: ${new Date().toLocaleString('es-CL')}
// ============================================================

const PAPELI_DATA = ${JSON.stringify(data, null, 2)};
`;

    // Obtener SHA del archivo actual en GitHub
    const getRes = await fetch(
      `https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}?ref=${GH_BRANCH}`,
      {
        headers: {
          'Authorization': `token ${GH_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    let sha = null;
    if (getRes.ok) {
      const getJson = await getRes.json();
      sha = getJson.sha;
    }

    // Subir el archivo a GitHub
    const putBody = {
      message: `Admin: actualización de contenido ${new Date().toLocaleString('es-CL')}`,
      content: Buffer.from(content).toString('base64'),
      branch: GH_BRANCH,
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GH_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putBody),
      }
    );

    if (putRes.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, message: 'Guardado y publicado correctamente' }),
      };
    } else {
      const err = await putRes.json();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message || 'Error al guardar en GitHub' }),
      };
    }

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
};