var cheerio = require('cheerio');
var htmlToText = require('html-to-text');

module.exports = (function () {
    function handler(robot) {
        robot.respond(/what'?s for lunch/i, parseForSpecificVenue);
        robot.respond(/what'?s (?:(?:on |at )?the|today'?s) cafe/i, fetchCafeMenu);
        robot.respond(/(?:which|today'?s|what(?:'s)(?: the)?) food ?truck/i, fetchFoodTruck);
    }

    function parseForSpecificVenue(msg) {
        var query = msg.match[0] + "";
        var askingForCafe = (/cafe/i).test(query);
        var askingForTruck = (/truck/i).test(query);
        var noSpecificVenue = !askingForCafe && !askingForTruck;
        if (askingForCafe || noSpecificVenue)
            fetchCafeMenu(msg);
        if (askingForTruck || noSpecificVenue)
            fetchFoodTruck(msg);
    }

    function fetchCafeMenu(msg) {
        console.log("Lunch request detected")
        var thisMonday = getThisMonday();
        var dayOfWorkWeek = getDayOfWorkWeek();
        var menuPath = "9PEU5T~" + thisMonday + "/$file/day" +
            dayOfWorkWeek + ".htm";
        var todaysMenuUrl = "http://dining.guckenheimer.com/clients/servicenowsd/fss/fss.nsf/weeklyMenuLaunch/" +
            menuPath;

        console.log("Using menu URL: " + todaysMenuUrl);
        robot.http(todaysMenuUrl).get()(function (err, res, body) {
            var menuDom, menuHtml, menuPlainText;
            if (res.statusCode != 200) {
                console.log("Made request, but status code is error: " + res.statusCode);
                msg.send("Not sure what's for lunch, can't get menu :(");
            } else {
                console.log("Made request, response status 200");

                menuDom = cheerio.load(body);
                menuHtml = menuDom("#center_text");

                console.log("Cheerio found menu element: " + !!menuHtml);
                console.log("Cheerio extracted html from menu element: " + menuHtml.html());

                menuPlainText = formatMenuMarkupAsPlainText(menuHtml.html() + "");
                menuPlainText = removeBreakFastFromFormattedMenu(menuPlainText);
                console.log("Html-to-text massaged into plain text: " + menuPlainText);
                msg.send("/quote The Surf & Saddle Cafe is serving:\n\n" + menuPlainText);
            }
        });
    }

    function getThisMonday() {
        var today = new Date();
        var month = leadingZero(today.getMonth() + 1);
        var dayOfMonth = today.getDate();
        var daysSinceMonday = (today.getDay() + 7) % 8;
        var mondayThisWeek = leadingZero(dayOfMonth - daysSinceMonday);
        var year = today.getFullYear();
        return month + "-" + mondayThisWeek + "-" + year;
    }

    function leadingZero(base) {
        return ("000" + base).substr(-2);
    }

    function getDayOfWorkWeek() {
        var today = new Date();
        return (function dayOfWorkWeek(date) {
            var dayOfWeek = new Date().getDay();
            var friday = 5, monday = 1;
            return (dayOfWeek > friday || dayOfWeek < monday) ? friday : dayOfWeek;
        }(today));
    }

    function formatMenuMarkupAsPlainText(menuHtml) {
        var rawMenu = htmlToText.fromString(menuHtml, { ignoreImage: true, ignoreHref: true, wordwrap: 40 });
        return rawMenu.replace(/(?:\n|^)((?:[A-Z]+[ ~]+)+)/g, "\n\n$1\n\n").replace(/(\n+|^)(.[^A-Z])/g, "$1    $2").trim();
    }

    function removeBreakFastFromFormattedMenu(formattedMenu) {
        var choppedUpMenu = formattedMenu.split("\n\n");
        var i, menuPiece;
        for (i = 0; i < choppedUpMenu.length; i++) {
            menuPiece = choppedUpMenu[i];
            if (menuPiece.indexOf("BREAKFAST") == 0) {
                choppedUpMenu.splice(i, 2);
            }
        }
        return choppedUpMenu.join("\n\n");
    }

    function fetchFoodTruck(msg) {
        var foodTruckUrl = "http://sdfoodtrucks.com/";
        robot.http(foodTruckUrl).get()(function (err, res, body) {
            var truckListingDom, trucksTodayNode, eastGateTrucks = [];
            if (res.statusCode != 200) {
                console.log("Made request, but status code is error: " + res.statusCode);
                msg.send("Not sure what's for lunch, can't get truck listing :(");
            } else {
                console.log("Made request, response status 200");
                truckListingDom = cheerio.load(body);
                trucksTodayNode = truckListingDom(".entry-content ul");
                cheerio("li", trucksTodayNode).each(function () {
                    var truckListingNode = cheerio(this);
                    var truckName;
                    if ((/bridgepoint|4810 eastgate ?mall/i).test(truckListingNode.html() + "")) {
                        truckName = cheerio("strong", truckListingNode).text();
                        eastGateTrucks.push(truckName);
                    }
                });
                if (eastGateTrucks.length) {
                    msg.send("/quote The Eastgate food truck listing today:\n\n" + eastGateTrucks.join("\n"));
                } else {
                    msg.send("/quote No trucks listed today at " + foodTruckUrl);
                }
            }
        });
    }

    return handler;
}());