module.exports = (function () {
    function handler(robot) {
        robot.respond(/what's for lunch/i, sayLunch);
    }

    function sayLunch(msg) {
        var cafeMenu = fetchCafeMenu();
        msg.send(cafeMenu);
    }

    function fetchCafeMenu() {
        return "CAFE MENU:\n\n/quote BREAKFAST SPECIAL\n" +
        "Sauteed Kale, Feta, Roasted Red Pepper Omelet with a side of Seasonal Fruit\n" +
        "$4.75\n\n" +

        "SOUPS\n" +
        "Smoked Ham and Spit Pea Soup\n" +
        "$2.25~$3.25";
    }

    return handler;
}());