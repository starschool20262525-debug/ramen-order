const WORKER_URL =
  "https://rame-order-api.starschool20262525.workers.dev";

const PUSHER_KEY = "bf49b4f0cec0367b306c";
const PUSHER_CLUSTER = "ap3";

const menuData = [
   {
    id:"m26",
    name:"【期間限定】冷やし中華",
    price:"880",
    available:true
  },
  {
    id:"m27",
    name:"【期間限定】冷やしラーメン",
    price:"700",
    available:true
  },
  {
    id: "m1",
    name: "ラーメン",
    price:"580",
    available: true
  },
  {
    id:"m2",
    name:"ラーメンセット（半チャーハン、サラダ付き）",
    price:"860",
    available:true
  },
  {
    id: "m3",
    name: "タンメン",
    price:"650",
    available: true
  },
  {
    id: "m4",
    name: "チャーシューメン",
    price:"800",
    available: true
  },
  {
    id: "m5",
    name: "麻婆メン",
    price:"750",
    available: true
  },
  {
    id:"m6",
    name:"麻婆丼",
    price:"800",
    available:true
  },
  {
    id: "m7",
    name: "もやしそば",
    price:"650",
    available:true
  },
  {
    id:"m8",
    name:"もやしそば（あんかけ）",
    price:"700",
    available:true
  },
  {
    id:"m9",
    name:"野菜そば",
    price:"650",
    available:true
  },
   {
    id:"m11",
    name:"味噌ラーメン",
    price:"650",
    available:true
  },
   {
    id:"m12",
    name:"ちゃんぽん麺",
    price:"800",
    available:true
  },
   {
    id:"m13",
    name:"野菜炒めセット（ライス、味噌汁付き）",
    price:"810",
    available:true
  },
   {
    id:"m14",
    name:"カレーライスセット（サラダ、スープ付き）",
    price:"880",
    available:true
  },
   {
    id:"m15",
    name:"焼肉ライス（生姜味）セット（味噌汁付き）",
    price:"890",
    available:true
  },
   {
    id:"m16",
    name:"焼肉ライス（ニンニク味）セット（味噌汁付き）",
    price:"890",
    available:true
  },
   {
    id:"m17",
    name:"ワンタン",
    price:"580",
    available:true
  },
   {
    id:"m18",
    name:"ワンタン麺",
    price:"680",
    available:true
  },
   {
    id:"m19",
    name:"チャーハン",
    price:"700",
    available:true
  },
   {
    id:"m20",
    name:"半チャーハン",
    price:"370",
    available:true
  },
   {
    id:"m21",
    name:"中華丼",
    price:"800",
    available:true
  },
   {
    id:"m22",
    name:"ライス",
    price:"300",
    available:true
  },
   {
    id:"m23",
    name:"半ライス",
    price:"170",
    available:true
  },
   {
    id:"m24",
    name:"瓶ビール（大）",
    price:"650",
    available:true
  },
   {
  　id:"m25",
  　name:"瓶ビール（中）",
    price:"550",
    available:true
   }


];

let order = {};

menuData.forEach(item => {
  order[item.id] = 0;
});

let kitchenOrders = [];

let pusher = null;
let channel = null;


// =====================================
// ページ判定
// =====================================

function isCustomerPage() {
  return document.getElementById("menu-list") !== null;
}

function isKitchenPage() {
  return document.getElementById("order-list") !== null;
}

// =====================================
// ステータス
// =====================================

function setStatus(text) {
  const element =
    document.getElementById("connection-status");

  if (element) {
    element.innerText = text;
  }
}


// =====================================
// Pusher接続
// =====================================

function connectPusher() {

  if (typeof Pusher === "undefined") {
    setStatus("通信部品を読み込めませんでした。");
    return;
  }

  pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER
  });

  channel = pusher.subscribe("ramen-channel");

  channel.bind(
    "pusher:subscription_succeeded",
    function() {
      setStatus("通信中");
    }
  );


  // -------------------------------
  // 新しい注文
  // -------------------------------

  channel.bind("new-order", function(data) {

    console.log("新しい注文:", data);

    if (!isKitchenPage()) {
      return;
    }

    kitchenOrders.push(data);

    saveKitchenOrders();
    renderKitchenOrders();
    playNotification();
  });


  // -------------------------------
  // メニュー変更
  // -------------------------------

  channel.bind("toggle-menu", function(data) {

    console.log("メニュー変更:", data);

    const item =
      menuData.find(
        item => item.id === data.id
      );

    if (!item) {
      return;
    }

    item.available = data.available;

    // 売り切れになった商品は
    // お客さん側の選択数を0にする
    if (!item.available) {
      order[item.id] = 0;
    }

    if (isCustomerPage()) {
      renderCustomerMenu();
      updateSummary();
    }

    if (isKitchenPage()) {
      renderKitchenMenu();
    }
  });
}


// =====================================
// お客さん側
// =====================================

function renderCustomerMenu() {

  const container =
    document.getElementById("menu-list");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  menuData.forEach(item => {

    const element =
      document.createElement("div");

    element.className =
      "menu-item " +
      (item.available ? "" : "sold-out");


    element.innerHTML = `

      ${
        item.available
          ? ""
          : `<div class="sold-out-badge">
               うりきれ
             </div>`
      }

      <div class="menu-info">

        <div class="menu-name">
          ${escapeHTML(item.name)}
        </div>

        <div class="menu-price">
          ${item.price}円
        </div>

      </div>

      <div class="controls">

        <button
          class="btn btn-minus"
          ${item.available ? "" : "disabled"}
          onclick="changeQty('${item.id}', -1)">
          ー
        </button>

        <span
          class="count-display"
          id="qty-${item.id}">
          ${order[item.id]}
        </span>

        <button
          class="btn btn-plus"
          ${item.available ? "" : "disabled"}
          onclick="changeQty('${item.id}', 1)">
          ＋
        </button>

      </div>
    `;

    container.appendChild(element);
  });
}


// =====================================
// 個数変更
// =====================================

function changeQty(id, change) {

  const item =
    menuData.find(item => item.id === id);

  if (!item || !item.available) {
    return;
  }

  order[id] += change;

  if (order[id] < 0) {
    order[id] = 0;
  }

  const counter =
    document.getElementById(`qty-${id}`);

  if (counter) {
    counter.innerText = order[id];
  }

  updateSummary();
}


// =====================================
// 注文内容表示
// =====================================

function updateSummary() {

  const container =
    document.getElementById("summary-items");

  const totalElement =
    document.getElementById("total-price");

  if (!container || !totalElement) {
    return;
  }

  container.innerHTML = "";

  let total = 0;
  let hasItems = false;

  menuData.forEach(item => {

    const quantity =
      order[item.id];

    if (
      quantity > 0 &&
      item.available
    ) {

      hasItems = true;

      const itemTotal =
        item.price * quantity;

      total += itemTotal;

      const line =
        document.createElement("div");

      line.className = "summary-line";

      line.innerHTML = `

        <span>
          ${escapeHTML(item.name)}
          × ${quantity}
        </span>

        <span>
          ${itemTotal} 円
        </span>
      `;

      container.appendChild(line);
    }
  });


  if (!hasItems) {

    container.innerHTML = `
      <div class="empty-summary">
        まだえらばれていません
      </div>
    `;
  }

  totalElement.innerText =
    `${total} 円`;
}


// =====================================
// 注文送信
// =====================================

async function submitOrder() {

  let total = 0;
  let orderText = "";

  menuData.forEach(item => {

    const quantity =
      order[item.id];

    if (
      quantity > 0 &&
      item.available
    ) {

      orderText +=
        `${item.name} × ${quantity}\n`;

      total +=
        item.price * quantity;
    }
  });


  if (total === 0) {

    alert(
      "商品を1つ以上えらんでください。"
    );

    return;
  }


  const submitButton =
    document.querySelector(".btn-submit") ||
    document.querySelector(".submit");


  if (submitButton) {

    submitButton.disabled = true;

    submitButton.innerText =
      "お店につたえています…";
  }


  try {

    const orderData = {

      id: Date.now().toString(),

      time:
        new Date().toLocaleTimeString(
          "ja-JP",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        ),

      order: orderText,

      total: total
    };


    const response =
      await fetch(
        `${WORKER_URL}/order`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(orderData)
        }
      );


    const result =
      await response.json();


    if (!response.ok) {

      throw new Error(
        result.error ||
        "注文送信エラー"
      );
    }


    alert(
      "注文をお店につたえました！"
    );


    // 注文をリセット

    menuData.forEach(item => {
      order[item.id] = 0;
    });

    renderCustomerMenu();
    updateSummary();


  } catch (error) {

    console.error(error);

    alert(
      "注文を送信できませんでした。\n" +
      "通信状態を確認してください。"
    );

  } finally {

    if (submitButton) {

      submitButton.disabled = false;

      submitButton.innerText =
        "お店につたえる";
    }
  }
}


// =====================================
// お店側 メニュー
// =====================================

function renderKitchenMenu() {

  const container =
    document.getElementById("menu-buttons");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  menuData.forEach(item => {

    const button =
      document.createElement("button");

    button.className =
      "menu-button " +
      (
        item.available
          ? "selling"
          : "stopped"
      );


    button.innerText =
      `${item.name}: ` +
      (
        item.available
          ? "〇 販売中"
          : "✕ 販売停止"
      );


    button.onclick =
      () => toggleMenu(
        item.id,
        !item.available
      );


    container.appendChild(button);
  });
}


// =====================================
// 販売停止 / 再開
// =====================================

async function toggleMenu(id, available) {

  try {

    const response =
      await fetch(
        `${WORKER_URL}/menu`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              id: id,
              available: available
            })
        }
      );


    const result =
      await response.json();


    if (!response.ok) {

      throw new Error(
        result.error ||
        "メニュー変更エラー"
      );
    }


    const item =
      menuData.find(
        item => item.id === id
      );


    if (item) {
      item.available = available;
    }


    renderKitchenMenu();


  } catch (error) {

    console.error(error);

    alert(
      "メニューの変更に失敗しました。"
    );
  }
}


// =====================================
// お店側 注文表示
// =====================================

function renderKitchenOrders() {

    const container =
        document.getElementById("order-list");

    if (!container) return;

    container.innerHTML = "";

    if (kitchenOrders.length === 0) {

        container.innerHTML = `
            <div class="empty">
                まだ注文はありません。
            </div>
        `;

        return;
    }


    kitchenOrders
        .slice()
        .reverse()
        .forEach(orderData => {

            const card =
                document.createElement("div");

            card.className = "order-card";


            // 注文内容を安全に取得
            const orderText =
                orderData.text ||
                orderData.order ||
                "";


            card.innerHTML = `

                <div class="order-header">

                    <span>
                        注文
                        ${escapeHTML(orderData.id)}
                    </span>

                    <span>
                        ${escapeHTML(orderData.time)}
                    </span>

                </div>


                <div class="order-items">

                    ${escapeHTML(orderText)}

                </div>


                <div class="order-total">

                    合計：
                    ${Number(orderData.total) || 0}
                    円

                </div>


                <button
                    class="order-button"
                    onclick="completeOrder('${orderData.id}')">

                    提供済みにする

                </button>

            `;


            if (
                orderData.status === "提供済み"
            ) {

                card.classList.add("completed");

            }


            container.appendChild(card);

        });

}


// =====================================
// 提供済み
// =====================================

function completeOrder(id) {

  kitchenOrders =
    kitchenOrders.map(orderData => {

      if (
        String(orderData.id) ===
        String(id)
      ) {

        return {
          ...orderData,
          status: "提供済み"
        };
      }

      return orderData;
    });


  saveKitchenOrders();
  renderKitchenOrders();
}


// =====================================
// ローカル保存
// =====================================

function saveKitchenOrders() {

  localStorage.setItem(
    "ramen-kitchen-orders",
    JSON.stringify(
      kitchenOrders
    )
  );
}


function loadKitchenOrders() {

  try {

    kitchenOrders =
      JSON.parse(
        localStorage.getItem(
          "ramen-kitchen-orders"
        ) || "[]"
      );

  } catch {

    kitchenOrders = [];
  }
}


// =====================================
// 通知音
// =====================================

function playNotification() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    const audioContext =
      new AudioContext();

    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();


    oscillator.frequency.value =
      880;

    gain.gain.value =
      0.15;


    oscillator.connect(gain);
    gain.connect(
      audioContext.destination
    );


    oscillator.start();

    oscillator.stop(
      audioContext.currentTime +
      0.25
    );

  } catch {

    // 通知音が使えなくても
    // 注文システム自体は動作します。
  }
}


// =====================================
// HTMLエスケープ
// =====================================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================
// 起動
// =====================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    if (isKitchenPage()) {

      loadKitchenOrders();

      renderKitchenMenu();

      renderKitchenOrders();
    }


    if (isCustomerPage()) {

      renderCustomerMenu();

      updateSummary();
    }


    connectPusher();
  }
);
