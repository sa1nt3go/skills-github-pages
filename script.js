import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8.0.0/+esm';

const apkUrlInput = document.getElementById('apkUrl');
const apkSelect = document.getElementById('apkSelect');
const openAppSelect = document.getElementById('openAppSelect');
const output = document.getElementById('output');
const downloadBtn = document.getElementById('downloadBtn');
const openBtn = document.getElementById('openBtn');
const shareBtn = document.getElementById('shareBtn');
const historyBtn = document.getElementById('historyBtn');

// Логирование
function log(message) {
  console.log(`[APK Share] ${message}`);
  output.textContent = message;
}

// Открытие IndexedDB
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
    log(`Ошибка IndexedDB: ${error.message}`);
    throw error;
  }
}

// Загрузка и сохранение APK
async function downloadAndSaveApk() {
  const url = apkUrlInput.value.trim();
  if (!url || !url.match(/\.(apk)$/i)) {
    log('Введите действительный URL APK (например, https://example.com/app.apk)');
    return;
  }

  log('Загрузка APK...');
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.android.package-archive' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ошибка: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    let received = 0;
    const chunks = [];
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (contentLength) {
        log(`Загружено: ${(received / contentLength * 100).toFixed(2)}%`);
      }
    }

    const blob = new Blob(chunks);
    if (blob.size > 100 * 1024 * 1024) {
      log('APK слишком большой (>100 МБ). Скачайте напрямую.');
      const a = document.createElement('a');
      a.href = url;
      a.textContent = 'Скачать APK';
      a.target = '_blank';
      output.appendChild(a);
      return;
    }

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

    log(`APK сохранен: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} МБ)\nНажмите "Открыть последний APK" для проверки или "Поделиться".`);
  } catch (error) {
    log(`Ошибка: ${error.message}\nСкачайте APK напрямую: ${url}`);
    const a = document.createElement('a');
    a.href = url;
    a.textContent = 'Скачать APK';
    a.target = '_blank';
    output.appendChild(a);
  }
}

// Открытие последнего APK для проверки
async function openLastApk() {
  if (!navigator.share || !navigator.canShare) {
    log('Web Share API не поддерживается. Скачивание файла...');
    await downloadLastApk();
    return;
  }

  try {
    const db = await getDB();
    const apks = await db.getAll('apks');
    if (!apks.length) {
      log('Нет сохраненных APK. Загрузите APK по URL.');
      return;
    }

    const lastApk = apks[apks.length - 1];
    const file = new File([lastApk.data], lastApk.name, {
      type: 'application/vnd.android.package-archive',
    });

    if (!navigator.canShare({ files: [file] })) {
      log('Передача файлов не поддерживается. Скачивание файла...');
      await downloadLastApk();
      return;
    }

    // Обновленная функция openLastApk
async function openLastApk() {
  if (!navigator.share || !navigator.canShare) {
    log('Web Share API не поддерживается. Скачивание файла...');
    await downloadLastApk();
    return;
  }

  try {
    const db = await getDB();
    const apks = await db.getAll('apks');
    if (!apks.length) {
      log('Нет сохраненных APK. Загрузите APK по URL.');
      return;
    }

    const lastApk = apks[apks.length - 1];
    const file = new File([lastApk.data], lastApk.name, {
      type: 'application/vnd.android.package-archive',
    });

    if (!navigator.canShare({ files: [file] })) {
      log('Передача файлов не поддерживается. Скачивание файла...');
      await downloadLastApk();
      return;
    }

    const appType = openAppSelect.value;
    let shareTitle, shareText, alertMessage;
    switch (appType) {
      case 'file':
        shareTitle = Открыть ${file.name} в файловом менеджере;
        shareText = Проверьте APK ${file.name} в файловом менеджере (например, Google Files);
        alertMessage = 'Выберите файловый менеджер, например, "Google Files" или "Файлы", для проверки APK.';
        break;
      case 'installer':
        shareTitle = Открыть ${file.name} в Package Installer;
        shareText = Проверьте APK ${file.name} в Package Installer;
        alertMessage = 'Выберите "Package Installer" для проверки APK.';
        break;
      case 'other':
      default:
        shareTitle = Открыть ${file.name};
        shareText = Проверьте APK ${file.name} в приложении по вашему выбору;
        alertMessage = 'Выберите приложение для проверки APK (например, файловый менеджер или анализатор).';
        break;
    }

    await navigator.share({
      files: [file],
      title: shareTitle,
      text: shareText,
    });
    log(APK ${file.name} передан для открытия.\nПроверьте файл и вернитесь для установки.);
    alert(alertMessage);
  } catch (error) {
    log(error.name === 'AbortError' ? 'Действие отменено' : Ошибка открытия: ${error.message});
    await downloadLastApk();
  }
}
  } catch (error) {
    log(error.name === 'AbortError' ? 'Действие отменено' : `Ошибка открытия: ${error.message}`);
    await downloadLastApk();
  }
}

// Передача APK через Web Share API для установки
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
      log('Нет сохраненных APK. Загрузите APK по URL.');
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
      title: `Установить ${file.name}`,
      text: `Установите ${file.name}`,
    });
    log(`APK ${file.name} передан.\nВыберите "Package Installer" для установки.\nПроверьте настройки "Установка из неизвестных источников".`);
    alert('Выберите "Package Installer" для установки.');
  } catch (error) {
    log(error.name === 'AbortError' ? 'Обмен отменен' : `Ошибка: ${error.message}`);
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
    log('APK скачан. Откройте в "Загрузках" или файловом менеджере для проверки/установки.');
  } catch (error) {
    log(`Ошибка скачивания: ${error.message}`);
  }
}

// Показ истории
async function showHistory() {
  try {
    const db = await getDB();
    const history = await db.getAll('history');
    if (!history.length) {
      log('История пуста');
      return;
    }

    output.innerHTML = '<h3>История загрузок:</h3>' + history
      .map(item => `
        <div class="history-item">
          ${item.name} (${(item.size / 1024 / 1024).toFixed(2)} МБ)<br>
          URL: <a href="${item.url}" target="_blank">${item.url}</a><br>
          Загружен: ${new Date(item.date).toLocaleString()}
        </div>
      `)
      .join('');
  } catch (error) {
    log(`Ошибка истории: ${error.message}`);
  }
}

// Привязка событий
downloadBtn.addEventListener('click', () => {
  console.log('Download button clicked');
  downloadAndSaveApk();
});
openBtn.addEventListener('click', () => {
  console.log('Open button clicked');
  openLastApk();
});
shareBtn.addEventListener('click', () => {
  console.log('Share button clicked');
  shareLastApk();
});
historyBtn.addEventListener('click', () => {
  console.log('History button clicked');
  showHistory();
});

apkSelect.addEventListener('change', () => {
  apkUrlInput.value = apkSelect.value;
  if (apkSelect.value) {
    log(`Выбран URL: ${apkSelect.value}`);
  }
});

apkUrlInput.addEventListener('input', () => {
  const url = apkUrlInput.value.trim();
  if (url) {
    log(`URL: ${url}. Нажмите "Скачать".`);
  }
});

// Инициализация
log('Приложение готово. Вставьте URL APK или выберите из списка.');
