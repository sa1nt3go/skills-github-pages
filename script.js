// Импорт библиотеки idb
import { openDB } from 'https://unpkg.com/idb@7.0.0/build/esm/index.js';

const apkUrlInput = document.getElementById('apkUrl');
const output = document.getElementById('output');

// Открытие или создание базы данных IndexedDB
async function getDB() {
  return await openDB('apkDB', 1, {
    upgrade(db) {
      db.createObjectStore('apks', { keyPath: 'name' });
      db.createObjectStore('history', { autoIncrement: true });
    },
  });
}

// Загрузка APK с сервера и сохранение в IndexedDB
async function downloadAndSaveApk() {
  const url = apkUrlInput.value.trim();
  if (!url || !url.match(/\.(apk)$/i)) {
    output.textContent = 'Пожалуйста, введите действительный URL APK (например, https://example.com/app.apk)';
    return;
  }

  output.textContent = 'Загрузка APK...';
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.android.package-archive',
      },
    });

    if (!response.ok) {
      throw new Error(Ошибка HTTP: ${response.status}. Возможно, сервер не поддерживает CORS.);
    }

    const blob = await response.blob();
    const fileName = url.split('/').pop() || 'app.apk';
    const file = new File([blob], fileName, {
      type: 'application/vnd.android.package-archive',
    });

    // Сохранение в IndexedDB
    const db = await getDB();
    await db.put('apks', { name: fileName, data: file });
    await db.add('history', {
      name: fileName,
      size: file.size,
      url,
      date: new Date(),
    });

    output.textContent = APK загружен и сохранен: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} МБ)\nНажмите "Поделиться последним APK" для установки.;
  } catch (error) {
    output.textContent = Ошибка загрузки: ${error.message}\nПопробуйте скачать APK напрямую по ссылке: ${url};
    const a = document.createElement('a');
    a.href = url;
    a.textContent = 'Скачать APK';
    output.appendChild(a);
  }
}

// Передача последнего APK через Web Share API
async function shareLastApk() {
  if (!navigator.share || !navigator.canShare) {
    output.textContent = 'Web Share API не поддерживается. Попробуйте скачать файл.';
    await downloadLastApk();
    return;
  }

  try {
    const db = await getDB();
    const apks = await db.getAll('apks');
    if (!apks.length) {
      output.textContent = 'Нет сохраненных APK. Загрузите APK по URL.';
      return;
    }

    const lastApk = apks[apks.length - 1];
    const file = new File([lastApk.data], lastApk.name, {
      type: 'application/vnd.android.package-archive',
    });

    if (!navigator.canShare({ files: [file] })) {
      output.textContent = 'Передача файлов не поддерживается. Попробуйте скачать файл.';
      await downloadLastApk();
      return;
    }

    await navigator.share({
      files: [file],
      title: Установить ${file.name},
      text: Установите приложение ${file.name} на ваше устройство,
    });
    output.textContent = APK ${file.name} передан в системный интерфейс.\nВыберите "Package Installer" для установки.\nЕсли установка не началась, проверьте настройки "Установка из неизвестных источников" для браузера.;
  } catch (error) {
    if (error.name === 'AbortError') {
      output.textContent = 'Обмен отменен пользователем';
    } else {
      output.textContent = Ошибка: ${error.message};
      await downloadLastApk();
    }
  }
}

// Альтернатива: скачивание APK
async function downloadLastApk() {
  try {
    const db = await getDB();
    const apks = await db.getAll('apks');
    if (! ${apks.length}) {
      output.textContent = 'Нет сохраненных APK для скачивания';
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
    output.textContent += '\nAPK скачан. Откройте файл в "Загрузках" и выберите "Package Installer" для установки.';
  } catch (error) {
    output.textContent = Ошибка скачивания: ${error.message};
  }
}

// Показ истории загрузок
async function showHistory() {
  try {
    const db = await getDB();
    const history = await db.getAll('history');
    if (!history.length) {
      output.textContent = 'История загрузок пуста';
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
    output.textContent = Ошибка загрузки истории: ${error.message};
  }
}

// Валидация URL при вводе
apkUrlInput.addEventListener('input', () => {
  const url = apkUrlInput.value.trim();
  if (url) {
    output.textContent = URL: ${url}. Нажмите "Скачать и сохранить APK".;
  }
});
