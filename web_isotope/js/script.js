$(function() {
    // Isotopeの初期化
    const $grid = $('.data-group').isotope({
        itemSelector: '.data-item', // フィルタリング対象の要素
        layoutMode: 'fitRows' // レイアウトモード (masonry, fitRows, cellsByRow など)
    });

    // フィルタリングボタンがクリックされた時の処理
    $('.filters-button-group').on('click', 'button', function() {
        const filterValue = $(this).attr('data-filter'); // data-filter属性の値を取得
        $grid.isotope({ filter: filterValue }); // Isotopeにフィルタリングを適用
        // アクティブなボタンのスタイルを切り替える
        $('.filters-button-group .is-checked').removeClass('is-checked');
        $(this).addClass('is-checked');
    });
});