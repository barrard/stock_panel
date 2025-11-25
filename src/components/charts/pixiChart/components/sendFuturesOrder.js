import API from "../../../API";

/**
 * Send a futures order via the Rithmic API
 *
 * @param {Object} params - Order parameters
 * @param {number} params.transactionType - 1 = buy, 2 = sell
 * @param {number} params.priceType - 1 = Limit, 4 = Stop Market
 * @param {number} params.limitPrice - The price for the order
 * @param {Object} params.symbolData - Symbol data object containing fullSymbol and exchange
 * @param {string} params.symbolData.fullSymbol - Full symbol string (e.g., "ESZ4")
 * @param {string} params.symbolData.exchange - Exchange string (e.g., "CME")
 * @returns {Promise} - API response
 */
export async function sendFuturesOrder({ transactionType, limitPrice, priceType, symbolData }) {
    const datetime = new Date().getTime();

    const resp = await API.rapi_submitOrder({
        datetime,
        symbol: symbolData.fullSymbol,
        exchange: symbolData.exchange,
        priceType,
        limitPrice,
        transactionType,
        // Future bracket order options (commented for reference):
        // ...(isBracket && { bracketType: 6 }),
        // ...(tickTarget && { targetTicks: tickTarget }),
        // ...(tickLoss && { stopTicks: tickLoss }),
        // ...(isTrailingStop && { trailingStopTicks: tickLoss }),
        // ...(isOco && {
        //     ocoData: {
        //         priceType: oco2PriceType,
        //         limitPrice: oco2LimitPrice,
        //         transactionType: isOcoBuy ? 1 : 2,
        //     },
        // }),
    });

    return resp;
}

export default sendFuturesOrder;
