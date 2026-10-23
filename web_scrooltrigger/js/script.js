// 1. GSAPに「ScrollTrigger」プラグインを認識させる（おまじない）
gsap.registerPlugin(ScrollTrigger);

// 2. HTMLの読み込みが完了してから実行する
window.addEventListener("DOMContentLoaded", () => {
    
    // 横に長いコンテンツを包んでいる親要素を取得
    const wrapper = document.querySelector(".horizontal-container");

    // --- 横スクロールアニメーションの設定 ---
    gsap.to(wrapper, {
        /* x: 左右の動きを指定。
           関数 () => ... を使うことで、画面リサイズ時にも再計算されます。
           -(全体の幅 - 画面の幅) だけ左に動かすことで、一番右端まで表示させます。
        */
        x: () => -(wrapper.clientWidth - window.innerWidth), 
        
        // スクロール量と動きを1対1で一致させるため、アニメーションの加減速（イージング）を無効化
        ease: "none", 
        
        // スクロール連動の設定
        scrollTrigger: {
            // アニメーションの発火点となる要素
            trigger: ".horizontal-section", 
            
            // 開始位置：「対象要素のTOP」が「画面のTOP」に来たとき
            start: "top top", 
            
            // 終了位置：開始地点から2000px分スクロールしたら終了
            // この値が大きいほど、横スクロールのスピードはゆっくりになります
            end: "+=2000", 
            
            /* pin: true 
            // 重要！これが「画面を固定する」設定です。
            // 横スクロールが終わるまで、対象要素を画面に張り付かせます。
            */
            pin: true, 
            
            /* scrub: スクロール量にアニメーションを同期させる設定
            // 数字（秒数）を指定すると、スクロールを止めた後に少し遅れて追いつく
            // 「ヌルッ」とした滑らかな動きになります。
            */
            scrub: .5, 
            
            // ピン留めされる瞬間のカクつき（ラグ）を軽減するための設定
            anticipatePin: 1, 
            
            // 画面サイズが変わった時（スマホの回転など）に、位置や幅を再計算する
            invalidateOnRefresh: true, 
        }
    });
});