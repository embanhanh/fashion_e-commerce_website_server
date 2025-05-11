require('dotenv').config();

module.exports = {
    app_id: "2554",
    key1: "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn",
    key2: "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf",
    endpoint: "https://sb-openapi.zalopay.vn/v2/create",
    query_endpoint: "https://sb-openapi.zalopay.vn/v2/query",
    refund_endpoint: "https://sb-openapi.zalopay.vn/v2/refund",
    query_refund_endpoint: "https://sb-openapi.zalopay.vn/v2/query_refund",
    redirecturl: "http://localhost:3000/cart",
    callback_url: "https://09e3-2401-d800-179-b117-708c-8b53-669-242e.ngrok-free.app/zalo-pay/zalo_return"
};

