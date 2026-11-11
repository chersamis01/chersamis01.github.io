const wishlistItems = [
  {
    name: "季節のドリップコーヒー",
    image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1100&q=85",
    imageAlt: "丁寧にハンドドリップされるコーヒー",
    description: "果実のような香りと、やさしい甘さのシングルオリジン。",
    price: 580
  },
  {
    name: "ハニーカフェラテ",
    image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1100&q=85",
    imageAlt: "ミルクとエスプレッソが溶け合うカフェラテ",
    description: "深煎りエスプレッソに、ほんのり蜂蜜の甘みを添えて。",
    price: 680
  },
  {
    name: "バスクチーズケーキ",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1100&q=85",
    imageAlt: "こんがり焼き色のついたチーズケーキ",
    description: "表面は香ばしく、中はとろり。季節の果実とご一緒に。",
    price: 720
  }
];

const faqItems = [
  {
    question: "営業時間を教えてください。",
    answer: "営業時間は 10:00〜18:00、定休日は火曜日です。季節により変更となる場合がございます。"
  },
  {
    question: "席の予約はできますか？",
    answer: "お席のご予約はお電話にて承っています。当日のご予約はお受けできない場合がございますので、ご了承ください。"
  },
  {
    question: "駐車場はありますか？",
    answer: "店舗前に専用駐車場を4台分ご用意しています。満車の場合は近隣のコインパーキングをご利用ください。"
  }
];

const wishlistContainer = document.querySelector("#wishlist-items");
const faqContainer = document.querySelector("#faq-list");

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderWishlist(items) {
  if (!wishlistContainer) return;

  const fragment = document.createDocumentFragment();
  const heartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>';

  items.forEach((item, index) => {
    const card = createElement("article", "product-card");
    const imageWrap = createElement("div", "product-image-wrap");
    const image = createElement("img", "product-image");
    image.src = item.image;
    image.alt = item.imageAlt;
    image.loading = "lazy";
    image.decoding = "async";

    const number = createElement("span", "product-number", `WISH ${String(index + 1).padStart(2, "0")}`);
    const saveButton = createElement("button", "save-button");
    saveButton.type = "button";
    saveButton.setAttribute("aria-label", `${item.name}をウィッシュリストに追加`);
    saveButton.setAttribute("aria-pressed", "false");
    saveButton.innerHTML = heartIcon;
    saveButton.addEventListener("click", () => {
      const isSaved = saveButton.getAttribute("aria-pressed") === "true";
      saveButton.setAttribute("aria-pressed", String(!isSaved));
      saveButton.setAttribute("aria-label", `${item.name}をウィッシュリスト${isSaved ? "に追加" : "から削除"}`);
    });

    imageWrap.append(image, number, saveButton);

    const meta = createElement("div", "product-meta");
    const name = createElement("h3", "", item.name);
    const price = createElement("p", "product-price", `¥${item.price.toLocaleString("ja-JP")}`);
    meta.append(name, price);

    const description = createElement("p", "product-description", item.description);
    card.append(imageWrap, meta, description);
    fragment.append(card);
  });

  wishlistContainer.replaceChildren(fragment);
  wishlistContainer.setAttribute("aria-busy", "false");
}

function renderFaq(items) {
  if (!faqContainer) return;

  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    const entry = createElement("section", "faq-item");
    const button = createElement("button", "faq-question");
    const answerId = `faq-answer-${index + 1}`;
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", answerId);

    const question = createElement("span", "faq-question-text");
    question.append(createElement("span", "", `Q${String(index + 1).padStart(2, "0")}`));
    question.append(document.createTextNode(item.question));
    const toggle = createElement("span", "faq-toggle");
    toggle.setAttribute("aria-hidden", "true");
    button.append(question, toggle);

    const answer = createElement("div", "faq-answer");
    answer.id = answerId;
    answer.hidden = true;
    answer.append(createElement("p", "", item.answer));
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!isExpanded));
      answer.hidden = isExpanded;
    });

    entry.append(button, answer);
    fragment.append(entry);
  });

  faqContainer.replaceChildren(fragment);
}

renderWishlist(wishlistItems);
renderFaq(faqItems);