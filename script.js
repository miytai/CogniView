document.addEventListener("DOMContentLoaded", function() {
    
    const preloader = document.getElementById('preloader');
    const mainContent = document.getElementById('main-content');

    // Имитация загрузки (например, загрузка изображений или API запрос)
    // Вы можете изменить 2000 на меньшее (например, 1000 = 1 сек) или большее число
    setTimeout(() => {
        
        // 1. Плавно убираем прелоадер
        preloader.classList.add('fade-out');
        
        // 2. Делаем контент видимым, но пока прозрачным
        mainContent.classList.remove('hidden');
        
        // 3. Запускаем анимацию появления (Fade + Scale)
        setTimeout(() => {
            mainContent.classList.add('visible');
        }, 50);

        // 4. Полностью удаляем прелоадер из DOM, чтобы он не мешал кликам
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 700);

    }, 2000); // 2000 миллисекунд = 2 секунды
});