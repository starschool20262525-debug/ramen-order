const WORKER_URL =
    "https://rame-order-api.starschool20262525.workers.dev";

const PUSHER_KEY =
    "bf49b4f0cec0367b306c";

const PUSHER_CLUSTER =
    "ap3";


// ==================================================
// メニュー
// ==================================================

const menuData = [
    {
        id: "m1",
        name: "ラーメン",
        price: 700,
        available: true
    },
    {
        id: "m2",
        name: "チャーシューメン",
        price: 950,
        available: true
    },
    {
        id: "m3",
        name: "ギョーザ（5個）",
        price: 400,
        available: true
    },
    {
        id: "m4",
        name: "ライス",
        price: 150,
        available: true
    },
    {
        id: "m5",
        name: "【季節限定】冷やし中華",
        price: 850,
        available: false
    }
];


let order = {};

menuData.forEach(item => {
    order[item.id] = 0;
});


// お店側で受信した注文
let kitchenOrders = [];


// ==================================================
// Pusher
// ==================================================

let pusher = null;
let channel = null;


function connectPusher() {

    if (typeof Pusher === "undefined") {

        setStatus("Pusherを読み込めませんでした。");

        return;
    }


    pusher = new Pusher(PUSHER_KEY, {
        cluster: PUSHER_CLUSTER
    });


    channel =
        pusher.subscribe("ramen-channel");


    channel.bind(
        "pusher:subscription_succeeded",
        function() {

            setStatus("通信中");

        }
    );


    // ----------------------------------------------
    // 新しい注文
    // ----------------------------------------------

    channel.bind(
        "new-order",
        function(data) {

            console.log(
                "新しい注文を受信しました",
                data
            );


            if (isKitchenPage()) {

                kitchenOrders.unshift(data);

                saveKitchenOrders();

                renderKitchenOrders();

                playNotification();

                alert("新しい注文が届きました！");

            }

        }
    );


    // ----------------------------------------------
    // メニュー状態変更
    // ----------------------------------------------

    channel.bind(
        "menu-updated",
        function(data) {

            console.log(
                "メニュー状態変更",
                data
            );


            const item =
                menuData.find(
                    item => item.id === data.id
                );


            if (!item) return;


            item.available =
                data.available;


            // 売り切れになったら数量を0にする
            if (!item.available) {

                order[item.id] = 0;

            }


            // お客さん側
            if (isCustomerPage()) {

                renderCustomerMenu();

                updateSummary();

            }


            // お店側
            if (isKitchenPage()) {

                renderKitchenMenu();

            }

        }
    );

}


// ==================================================
// ページ判定
// ==================================================

function isCustomerPage() {

    return (
        document.getElementById("menu-list") !== null
    );

}


function isKitchenPage() {

    return (
        document.getElementById("orders") !== null
    );

}


// ==================================================
// 通信状態
// ==================================================

function setStatus(text) {

    const element =
        document.getElementById("status");


    if (element) {

        element.innerText = text;

    }

}


// ==================================================
// お客さん側
// ==================================================

function renderCustomerMenu() {

    const container =
        document.getElementById("menu-list");


    if (!container) return;


    container.innerHTML = "";


    menuData.forEach(item => {

        const element =
            document.createElement("div");


        element.className =
            "menu-item " +
            (
                item.available
                    ? ""
                    : "soldout"
            );


        let controls = "";


        if (item.available) {

            controls = `

                <button
                    class="btn minus"
                    onclick="changeQty('${item.id}', -1)">
                    −
                </button>

                <span
                    class="count"
                    id="qty-${item.id}">
                    ${order[item.id]}
                </span>

                <button
                    class="btn plus"
                    onclick="changeQty('${item.id}', 1)">
                    ＋
                </button>

            `;

        } else {

            controls = `

                <span
                    style="font-weight:bold;">
                    販売停止
                </span>

            `;

        }


        element.innerHTML = `

            ${
                item.available
                    ? ""
                    : '<div class="soldout-badge">うりきれ</div>'
            }

            <div class="menu-info">

                <div class="menu-name">
                    ${escapeHTML(item.name)}
                </div>

                <div class="menu-price">
                    ${item.price} 円
                </div>

            </div>

            <div class="controls">

                ${controls}

            </div>

        `;


        container.appendChild(element);

    });

}


// ==================================================
// 個数変更
// ==================================================

function changeQty(id, change) {

    const item =
        menuData.find(
            item => item.id === id
        );


    if (!item || !item.available) {

        return;

    }


    order[id] += change;


    if (order[id] < 0) {

        order[id] = 0;

    }


    const counter =
        document.getElementById(
            `qty-${id}`
        );


    if (counter) {

        counter.innerText =
            order[id];

    }


    updateSummary();

}


// ==================================================
// 注文確認
// ==================================================

function updateSummary() {

    const container =
        document.getElementById(
            "summary-items"
        );


    const totalElement =
        document.getElementById(
            "total-price"
        );


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


            line.className =
                "summary-line";


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

            <div
                style="text-align:center;color:#999;">
                まだえらばれていません
            </div>

        `;

    }


    totalElement.innerText =
        `${total} 円`;

}


// ==================================================
// 注文送信
// ==================================================

async function submitOrder() {

    let total = 0;

    const items = [];


    // ----------------------------
    // 注文内容を作る
    // ----------------------------

    menuData.forEach(item => {

        const quantity =
            order[item.id];


        if (
            quantity > 0 &&
            item.available
        ) {

            const itemTotal =
                item.price * quantity;


            total += itemTotal;


            items.push({

                id: item.id,

                name: item.name,

                price: item.price,

                quantity: quantity

            });

        }

    });


    // ----------------------------
    // 注文がない
    // ----------------------------

    if (items.length === 0) {

        alert(
            "商品を1つ以上えらんでください。"
        );

        return;

    }


    // ----------------------------
    // ボタンを無効化
    // ----------------------------

    const submitButton =
        document.querySelector(".submit");


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.innerText =
            "お店につたえています…";

    }


    // ----------------------------
    // 注文データ
    // ----------------------------

    const now =
        new Date();


    const orderData = {

        id:
            Date.now().toString(),

        time:
            now.toLocaleTimeString(
                "ja-JP",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ),

        items:
            items,

        total:
            total

    };


    console.log(
        "送信する注文",
        orderData
    );


    try {

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


        console.log(
            "注文送信成功",
            result
        );


        alert(
            "注文をお店につたえました！"
        );


        // ----------------------------
        // 注文をリセット
        // ----------------------------

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

    }


    // ----------------------------
    // ボタンを戻す
    // ----------------------------

    if (submitButton) {

        submitButton.disabled = false;

        submitButton.innerText =
            "お店につたえる";

    }

}


// ==================================================
// お店側 メニュー
// ==================================================

function renderKitchenMenu() {

    const container =
        document.getElementById(
            "menu-controls"
        );


    if (!container) return;


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
            item.name +
            " : " +
            (
                item.available
                    ? "〇 販売中"
                    : "✕ 販売停止"
            );


        button.onclick =
            () =>
                toggleMenu(
                    item.id,
                    !item.available
                );


        container.appendChild(button);

    });

}


// ==================================================
// 売り切れ変更
// ==================================================

async function toggleMenu(
    id,
    available
) {

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

                            id:
                                id,

                            available:
                                available

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


        // ローカル画面も即座に変更
        const item =
            menuData.find(
                item => item.id === id
            );


        if (item) {

            item.available =
                available;


            if (!available) {

                order[id] = 0;

            }

        }


        renderKitchenMenu();


    } catch (error) {

        console.error(error);


        alert(
            "メニューの変更に失敗しました。"
        );

    }

}


// ==================================================
// お店側 注文表示
// ==================================================

function renderKitchenOrders() {

    const container =
        document.getElementById(
            "orders"
        );


    if (!container) return;


    container.innerHTML = "";


    if (kitchenOrders.length === 0) {

        container.innerHTML = `

            <div class="empty">
                まだ注文はありません
            </div>

        `;

        return;

    }


    kitchenOrders.forEach(orderData => {

        const div =
            document.createElement("div");


        div.className =
            "order";


        let itemsHTML = "";


        // ----------------------------
        // 商品一覧
        // ----------------------------

        if (
            Array.isArray(orderData.items)
        ) {

            orderData.items.forEach(item => {

                const itemTotal =
                    Number(item.price) *
                    Number(item.quantity);


                itemsHTML += `

                    <div class="order-item">

                        <span>
                            ${escapeHTML(item.name)}
                            × ${item.quantity}
                        </span>

                        <span>
                            ${itemTotal} 円
                        </span>

                    </div>

                `;

            });

        }


        // ----------------------------
        // 注文カード
        // ----------------------------

        div.innerHTML = `

            <div class="order-header">

                <span>
                    注文
                </span>

                <span>
                    ${escapeHTML(
                        orderData.time || ""
                    )}
                </span>

            </div>


            ${itemsHTML}


            <div class="order-total">

                合計
                ${Number(orderData.total) || 0}
                円

            </div>


            <button
                class="done"
                onclick="removeOrder('${escapeHTML(orderData.id)}')">

                提供済みにする

            </button>

        `;


        container.appendChild(div);

    });

}


// ==================================================
// 注文を消す
// ==================================================

function removeOrder(id) {

    kitchenOrders =
        kitchenOrders.filter(
            order =>
                String(order.id) !==
                String(id)
        );


    saveKitchenOrders();

    renderKitchenOrders();

}


// ==================================================
// ローカル保存
// ==================================================

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

        if (!Array.isArray(kitchenOrders)) {

            kitchenOrders = [];

        }

    } catch {

        kitchenOrders = [];

    }

}


// ==================================================
// 通知音
// ==================================================

function playNotification() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContext) return;


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

        // 音が使えない環境でも
        // システムは動作します。

    }

}


// ==================================================
// HTMLエスケープ
// ==================================================

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ==================================================
// 起動
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {


        // ----------------------------
        // お店側
        // ----------------------------

        if (isKitchenPage()) {

            loadKitchenOrders();

            renderKitchenMenu();

            renderKitchenOrders();

        }


        // ----------------------------
        // お客さん側
        // ----------------------------

        if (isCustomerPage()) {

            renderCustomerMenu();

            updateSummary();

        }


        // ----------------------------
        // Pusher接続
        // ----------------------------

        connectPusher();

    }
);
