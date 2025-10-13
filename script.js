
    // 🔑 CONFIGURACIÓN //
    const CLIENT_ID = "935035577743-7ds3utl0nsbat33sbt2ervnckcgeceqr.apps.googleusercontent.com"; //"TU_CLIENT_ID.apps.googleusercontent.com"; // Pon tu Client ID
    const SHEET_ID = "1D8QeHDNR2bp8Ylfft-AyGTjyNbk_LLF8b6_LwvqBMqY"; // "TU_SHEET_ID"; // Pon tu Sheet ID
    const FOLDER_ID = "1BwL4cPJzAQMdtHuO5eEQm4Vr47PcRli5";//"MI_FOLDER_ID"; // Poner mi Folder ID   
    const ANTECEDENTES_ID = "1K-WgTeSJ4FlVmSlTqvS3ezVXulCkz8sX"; //"TU_ID_DE_ANTECEDENTES"; // Reemplazá con el ID real https://drive.google.com/drive/folders/1K-WgTeSJ4FlVmSlTqvS3ezVXulCkz8sX?usp=drive_link
//    const SCOPES = "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets";
  const SCOPES = "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets";
   const RANGE = 'Documentos!A1:Z';

  let tokenClient;
  let gapiInited = false;
  let gisInited = false;

  // -------------------
  // Inicializar Google API Client
  function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
  }

  async function initializeGapiClient() {
    await gapi.client.init({
      discoveryDocs: [
        "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
        "https://sheets.googleapis.com/$discovery/rest?version=v4"
      ]
    });
    gapiInited = true;
    maybeEnableButtons();
  }/////////////////
  // -------------------
  // Inicializar Google Identity Services
  function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // se definirá al solicitar token
    });
    gisInited = true;
    maybeEnableButtons();
  }

  function maybeEnableButtons() {
    if (gapiInited && gisInited) {
      document.getElementById("login").disabled = false;
    }
  }

  // -------------------
  // Login con Google
document.getElementById("login").onclick = () => {
    tokenClient.callback = async (resp) => {
      if (resp.error) { console.error(resp); return; }
        
        //Guarda el token de acceso obtenido, para usarlo en las llamadas a la API.	Después de que el usuario autoriza el acceso.
        gapi.client.setToken({ access_token: resp.access_token });

      // Ocultar botón de login y mostrar contenido
      document.getElementById("login").style.display = "none";
    //  document.getElementById("contenido").style.display = "block";
       document.getElementById("app").style.display = "";

      // Listar carpetas
      listarCarpetas();
      listarArchivos(FOLDER_ID);
      loadSelectOptions();
        };
    
    // Inicia el proceso de login y solicita permisos.	Cuando el usuario hace clic en el botón.
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

// === CARGAR VALORES ÚNICOS PARA LOS SELECT ===
// === CARGAR VALORES ÚNICOS PARA LOS SELECT ===
async function loadSelectOptions() {
  try {
    const res = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE
    });

    const rows = res.result.values;
    if (!rows || rows.length < 2) return;

    const headers = rows[0];
    const data = rows.slice(1);

    const idxProyecto = headers.indexOf('Proyecto');
    const idxCategoria = headers.indexOf('Categoria');
    const idxEmisor = headers.indexOf('EmisorReceptor');
    const idxPropiedad = headers.indexOf('Propiedad');

    // Obtener valores únicos y ordenarlos alfabéticamente
    const proyectos = [...new Set(data.map(r => r[idxProyecto]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const categorias = [...new Set(data.map(r => r[idxCategoria]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const emisores = [...new Set(data.map(r => r[idxEmisor]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const propiedades = [...new Set(data.map(r => r[idxPropiedad]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    // Llenar los selects
    llenarSelect('proyecto', proyectos);
    llenarSelect('categoria', categorias);
    llenarSelect('emisor', emisores);
    llenarSelect('propiedad', propiedades);

  } catch (err) {
    console.error('Error cargando datos:', err);
    console.log('Error detallado:', JSON.stringify(err, null, 2));
  }
}

// === FUNCIÓN PARA LLENAR UN SELECT ===
function llenarSelect(id, opciones) {
  const select = document.getElementById(id);
  select.innerHTML = '<option value="">-- Seleccionar --</option>';

  // Insertar opciones ordenadas
  opciones.forEach(op => {
    const opt = document.createElement('option');
    opt.value = op;
    opt.textContent = op;
    select.appendChild(opt);
  });

  // Agregar opción para añadir un nuevo valor
  const nuevo = document.createElement('option');
  nuevo.value = '__nuevo__';
  nuevo.textContent = '➕ Agregar nuevo...';
  select.appendChild(nuevo);

  // Permitir agregar nuevos valores manualmente
  select.addEventListener('change', () => {
    if (select.value === '__nuevo__') {
      const valor = prompt('Ingrese un nuevo valor para ' + id);
      if (valor) {
        const opt = document.createElement('option');
        opt.value = valor;
        opt.textContent = valor;

        // Insertar manteniendo el orden alfabético
        const opcionesExistentes = Array.from(select.options)
          .filter(o => o.value !== '__nuevo__' && o.value !== '')
          .map(o => o.value)
          .concat(valor)
          .sort((a, b) => a.localeCompare(b));

        select.innerHTML = '<option value="">-- Seleccionar --</option>';
        opcionesExistentes.forEach(v => {
          const o = document.createElement('option');
          o.value = v;
          o.textContent = v;
          select.appendChild(o);
        });

        // Reagregar la opción “Agregar nuevo...”
        select.appendChild(nuevo);

        select.value = valor;
      } else {
        select.value = '';
      }
    }
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  function listarCarpetas(parentId = FOLDER_ID) {
  gapi.client.drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 50
  }).then(response => {
    const carpetas = response.result.files;
    const lista = document.getElementById("listaCarpetas");
    lista.innerHTML = "";

    // Si no estamos en la raíz, mostrar opción para volver
    if (parentId !== FOLDER_ID) {
      const volver = document.createElement("li");
      volver.textContent = "⬅️ Volver a raíz";
      volver.style.fontWeight = "bold";
      volver.onclick = () => {
        document.getElementById("carpetaSeleccionada").textContent = "Raíz";
        listarCarpetas(FOLDER_ID);
        listarArchivos(FOLDER_ID);
      };
      lista.appendChild(volver);
    }

    carpetas.forEach(c => {
      const li = document.createElement("li");
      li.textContent = c.name;
      li.onclick = () => {
        document.getElementById("carpetaSeleccionada").textContent = c.name;
        listarCarpetas(c.id); // Navegar a subcarpetas
        listarArchivos(c.id); // Mostrar archivos de esa carpeta
      };
      lista.appendChild(li);
    });
  });
}


    // Listar archivos de carpeta
    function listarArchivos(carpetaId) {
      gapi.client.drive.files.list({
      //  q: `'${carpetaId}' in parents and mimeType='application/pdf' and trashed=false`,
      //  q: `'${carpetaId}' in parents and trashed=false`,
        q: `'${carpetaId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,

       // fields: "files(id, name, webViewLink)",
        fields: "files(id, name, mimeType, webViewLink, webContentLink)",
        pageSize: 50
      }).then(response => {
        const files = response.result.files;
        const lista = document.getElementById("listaDocs");
        lista.innerHTML = "";
        if (files && files.length > 0) {
          files.forEach(f => {
            const li = document.createElement("li");
            li.textContent = f.name;
            ///////////////////////////////////////////////////////////////////////////////////////////////////////////
            li.onclick = () => {
              document.getElementById("archivoSeleccionado").value = f.name;
              document.getElementById("archivoSeleccionado").dataset.fileId = f.id;
              document.getElementById("visor").src = "https://drive.google.com/file/d/" + f.id + "/preview";
            };
            ///////////////////////////////////////////////////////////////////////////////////////////////////////////
       li.onclick = () => {
  const visor = document.getElementById("visor");
  const tipo = f.mimeType;

  // Limpiar visor antes de mostrar nuevo contenido
  visor.removeAttribute("src");
  visor.removeAttribute("srcdoc");

  document.getElementById("archivoSeleccionado").value = f.name;
  document.getElementById("archivoSeleccionado").dataset.fileId = f.id;

  const tiposVisibles = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif"
  ];

  if (tiposVisibles.includes(tipo)) {
    visor.src = `https://drive.google.com/file/d/${f.id}/preview`;
  } else {
    visor.srcdoc = `
      <div style="text-align:center; padding:20px; font-family:sans-serif;">
        <p><strong>No se puede visualizar este tipo de archivo aquí.</strong></p>
        <p>Tipo: ${tipo}</p>
        <a href="${f.webContentLink}" target="_blank" style="color:#2c3e50; font-weight:bold;">Descargar archivo</a>
      </div>
    `;
  }
};

            ///////////////////////////////////////////////////////////////////////////////////////////////////////////
            lista.appendChild(li);
          });
        } else {
          lista.innerHTML = "<li>No hay archivos PDF.</li>";
        }
      });
    }
// =======================Boton guardar 2========================
document.getElementById("formRegistro").addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita que el formulario recargue la página

  // ==============================
  // 1. Obtener valores del formulario
  // ==============================
  const archivo = document.getElementById("archivoSeleccionado").value;
  const fileId = document.getElementById("archivoSeleccionado").dataset.fileId || "";
  const proyecto = document.getElementById("proyecto").value;
  const categoria = document.getElementById("categoria").value;
  const emisor = document.getElementById("emisor").value;
  const propiedad = document.getElementById("propiedad").value;
  const comentarios = document.getElementById("comentarios").value;

  // ==============================
  // 2. Validación básica
  // ==============================
  if (!archivo || !proyecto) {
    alert("Seleccioná un archivo y completá el proyecto.");
    return;
  }

  // ==============================
  // 3. Preparar datos para Google Sheets
  // ==============================
  const valores = [
    new Date().toISOString(), // Fecha de registro
    archivo,                  // Nombre del archivo
    fileId,                   // ID del archivo en Drive
    proyecto,                 // Proyecto (antes 'asunto')
    categoria,                // Categoría
    emisor,                   // Emisor/Receptor
    propiedad,                // Propiedad
    comentarios               // Comentarios
  ];

  // ==============================
  // 4. Guardar en Google Sheets
  // ==============================
  try {
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "A:H", // Ahora tenemos 8 columnas (A a H)
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      resource: { values: [valores] }
    });

    // ==============================
    // 5. Obtener o crear carpeta del proyecto
    // ==============================
    const carpetaDestinoId = await obtenerOCrearCarpetaAsunto(proyecto);

    // ==============================
    // 6. Mover el archivo
    // ==============================
    await moverArchivoA(fileId, carpetaDestinoId);

    // ==============================
    // 7. Confirmar y limpiar
    // ==============================
    alert("Registro guardado y archivo movido a la carpeta del proyecto.");

    document.getElementById("archivoSeleccionado").value = "";
    document.getElementById("proyecto").value = "";
    document.getElementById("categoria").value = "";
    document.getElementById("emisor").value = "";
    document.getElementById("propiedad").value = "";
    document.getElementById("comentarios").value = "";
    document.getElementById("visor").src = "";

  } catch (error) {
    console.error("Error al guardar el registro:", error);
    alert("Ocurrió un error al guardar el registro. Revisá la consola.");
  }
});



   // ======================Boton guardar 1======================

document.getElementById("guardar").addEventListener("click", async () => {
  const btnGuardar = document.getElementById("guardar");
  btnGuardar.disabled = true; // evita doble clic

  try {
    // ======================
    // 1️⃣ Obtener valores del formulario
    // ======================
    const archivoElem = document.getElementById("archivoSeleccionado");
    const archivo = archivoElem.value.trim();
    const fileId = archivoElem.dataset.fileId || "";
    const asunto = document.getElementById("asunto").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const comentarios = document.getElementById("comentarios").value.trim();

    const proyecto = document.getElementById("proyecto").value.trim();  

    // ======================
    // 2️⃣ Validar datos mínimos
    // ======================
    if (!archivo || !asunto) {
      alert("⚠️ Por favor, seleccioná un archivo y completá el asunto.");
      return;
    }

    if (!fileId) {
      alert("⚠️ El archivo seleccionado no tiene un ID válido. Intentá seleccionarlo de nuevo.");
      return;
    }

    // ======================
    // 3️⃣ Preparar datos para Sheets
    // ======================
    const valores = [
      new Date().toISOString(), // Fecha/hora en formato ISO
      archivo,
      fileId,
      asunto,
      categoria,
      comentarios,
      asunto // ⚠️ revisá si querés duplicar este campo o reemplazarlo
    ];

    // ======================
    // 4️⃣ Guardar registro en Google Sheets
    // ======================
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "A:G", // columnas destino
      valueInputOption: "USER_ENTERED", // para que Sheets interprete fechas y números
      insertDataOption: "INSERT_ROWS",
      resource: { values: [valores] }
    });

    // ======================
    // 5️⃣ Crear (o localizar) la carpeta del asunto en Drive
    // ======================
    const carpetaDestinoId = await obtenerOCrearCarpetaAsunto(asunto);

    // ======================
    // 6️⃣ Mover el archivo a la carpeta correspondiente
    // ======================
    await moverArchivoA(fileId, carpetaDestinoId);

    // ======================
    // 7️⃣ Confirmar al usuario
    // ======================
    alert("✅ Registro guardado correctamente y archivo movido a la carpeta del asunto.");

    // ======================
    // 8️⃣ Limpiar formulario
    // ======================
    archivoElem.value = "";
    archivoElem.dataset.fileId = "";
    document.getElementById("asunto").value = "";
    document.getElementById("categoria").value = "";
    document.getElementById("comentarios").value = "";
    document.getElementById("visor").src = "";

  } catch (err) {
    console.error("❌ Error al guardar registro:", err);
    alert("❌ Ocurrió un error al guardar el registro.\nDetalles: " + (err.message || err));
  } finally {
    // ======================
    // 9️⃣ Reactivar botón
    // ======================
    btnGuardar.disabled = false;
  }
});
/*
   document.getElementById("guardar").addEventListener("click", async () => {
  const archivo = document.getElementById("archivoSeleccionado").value;
  const fileId = document.getElementById("archivoSeleccionado").dataset.fileId || "";
  const asunto = document.getElementById("asunto").value;
  const categoria = document.getElementById("categoria").value;
  const comentarios = document.getElementById("comentarios").value;
  //const asunto = document.getElementById("asunto").value;

  if (!archivo || !asunto) {
    alert("Seleccioná un archivo y completá el asunto.");
    return;
  }

  const valores = [
    new Date().toISOString(),
    archivo,
    fileId,
    asunto,
    categoria,
    comentarios,
    asunto
  ];

  // Guardar en Sheets
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "A:G",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: { values: [valores] }
  });

  // Obtener o crear carpeta de asunto
  const carpetaDestinoId = await obtenerOCrearCarpetaAsunto(asunto);

  // Mover archivo
  await moverArchivoA(fileId, carpetaDestinoId);

  alert("Registro guardado y archivo movido a carpeta de asunto.");

  // Limpiar formulario
  document.getElementById("archivoSeleccionado").value = "";
  document.getElementById("asunto").value = "";
  document.getElementById("categoria").value = "";
  document.getElementById("comentarios").value = "";
  document.getElementById("proyecto").value = "";
  document.getElementById("visor").src = "";
  
});

*/

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    async function obtenerOCrearCarpetaAsunto(nombreAsunto) {
  // Buscar carpeta con ese nombre dentro de Antecedentes
  const res = await gapi.client.drive.files.list({
    q: `'${ANTECEDENTES_ID}' in parents and mimeType='application/vnd.google-apps.folder' and name='${nombreAsunto}' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 1
  });

  if (res.result.files && res.result.files.length > 0) {
    return res.result.files[0].id; // Ya existe
  }

  // Crear nueva carpeta
  const nuevaCarpeta = await gapi.client.drive.files.create({
    resource: {
      name: nombreAsunto,
      mimeType: "application/vnd.google-apps.folder",
      parents: [ANTECEDENTES_ID]
    },
    fields: "id"
  });

  return nuevaCarpeta.result.id;
}
async function moverArchivoA(fileId, destinoId) {
  // Obtener padres actuales
  const file = await gapi.client.drive.files.get({
    fileId: fileId,
    fields: "parents"
  });

  const padresActuales = file.result.parents;

  // Mover archivo: quitar padres actuales y agregar nuevo
  await gapi.client.drive.files.update({
    fileId: fileId,
    addParents: destinoId,
    removeParents: padresActuales.join(","),
    fields: "id, parents"
  });
}


 // -------------------
  // Inicializar APIs al cargar ventana
  window.onload = () => {
    gapiLoaded();
    gisLoaded();
  };

