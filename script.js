import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8.0.0/+esm';
console.log("Script lo")

const apkUrlInput = document.getElementById('apkUrl');
const output = document.getElementById('output');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const historyBtn = document.getElementById('historyBtn');

// Логирование для отладки
function log(message) {
  console.log('[APK Share] ${message}');
  output.textContent += '\n${message';
}

// Открытие базы данных IndexedDB
async function getDB() {
  try {
    log('Открытие IndexedDB...');
    return await openDB('apkDB', 1, {
      upgrade(db) {
        db.createObjectStore('apks', { keyPath: 'name' });
        db.createObjectStore('history', { autoIncrement: true });
      },
    });
  } catch (error) {
    log('Ошибка IndexedDB: ${error.message}');
    throw error;
  }
}

// Загрузка и сохранение APK
async function downloadAndSaveApk() {
  const url = apkUrlInput.value.trim();
  if (!url || !url.match(/\.(apk)$/i)) {
    log('Введите действительный URL APK');
    return;
  }

  log('Загрузка APK...');
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.android.package-archive' },
    });

    if (!response.ok) {
      throw new Error(HTTP ошибка: ${response.status});
    }

    const blob = await response.blob();
    const fileName = url.split('/').pop() || 'app.apk';
    const file = new File([blob], fileName, {
      type: 'application/vnd.android.package-archive',
    });

    const db = await getDB();
    await db.put('apks', { name: fileName, data: file });
    await db.add('history', {
      name: fileName,
      size: file.size,
      url,
      date: new Date(),
    });

    log('APK сохранен: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} МБ)');
  } catch (error) {
    log('Ошибка загрузки: ${error.message}\nПопробуйте скачать напрямую: ${url}');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = 'Скачать APK';
    a.target = '_blank';
    output.appendChild(a);
  }
}

// Передача APK через Web Share API
async function shareLastApk() {
  if (!navigator.share || !navigator.canShare) {
    log('Web Share API не поддерживается');
    await downloadLastApk();
    return;
  }

  try {
    const db = await getDB();
    const apks = await db.getAll('apks');
    if (!apks.length) {
      log('Нет сохраненных APK');
      return;
    }

    const lastApk = apks[apks.length - 1];
    const file = new File([lastApk.data], lastApk.name, {
      type: 'application/vnd.android.package-archive',
    });

    if (!navigator.canShare({ files: [file] })) {
      log('Передача файлов не поддерживается');
      await downloadLastApk();
      return;
    }

    await navigator.share({
      files: [file],
      title: Установить ${file.name},
      text: Установите ${file.name},
    });
    log(APK ${file.name} передан. Выберите "Package Installer".);
  } catch (error) {
    log(error.name === 'AbortError' ? 'Обмен отменен' : 'Ошибка: ${error.message}');
    await downloadLastApk();
  }
}

// Скачивание APK как альтернатива
async function downloadLastApk() {
  try {
    const db = await getDB();
    const apks = await db.getAll('apks');
    if (!apks.length) {
      log('Нет сохраненных APK');
      return;
    }

    const lastApk = apks[apks.length - 1];
    const file = new File([lastApk.data], lastApk.name, {
      type: 'application/vnd.android.package-archive',
    });

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    log('APK скачан. Откройте в "Загрузках".');
  } catch (error) {
    log(Ошибка скачивания: ${error.message});
  }
}

// Показ истории загрузок
async function showHistory() {
  try {
    const db = await getDB();
    const history = await db.getAll('history');
    if (!history.length) {
      log('История пуста');
      return;
    }
output.innerHTML = '<h3>История загрузок:</h3>' + history
      .map(item => 
        <div class="history-item">
          ${item.name} (${(item.size / 1024 / 1024).toFixed(2)} МБ)<br>
          URL: <a href="${item.url}" target="_blank">${item.url}</a><br>
          Загружен: ${new Date(item.date).toLocaleString()}
        </div>
      )
      .join('');
  } catch (error) {
    log(Ошибка истории: ${error.message});
  }
}

// Привязка событий
downloadBtn.addEventListener('click', downloadAndSaveApk);
shareBtn.addEventListener('click', shareLastApk);
historyBtn.addEventListener('click', showHistory);

apkUrlInput.addEventListener('input', () => {
  const url = apkUrlInput.value.trim();
  if (url) {
    log('URL: ${url}. Нажмите "Скачать".');
  }
});

// Инициализация
log('Приложение загружено. Вставьте URL APK.');
