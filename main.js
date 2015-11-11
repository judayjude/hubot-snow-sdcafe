var cheerio = require('cheerio');
var htmlToText = require('html-to-text');

module.exports = (function () {
    function handler(robot) {
        robot.respond(/what'?s for lunch.*/i, parseForSpecificVenue);
        robot.respond(/what'?s (?:(?:on |at )?the|today'?s) cafe/i, fetchCafeMenu);
        robot.respond(/(?:which|today'?s|what(?:'s)(?: the)?) food ?truck/i, fetchFoodTruck);
    }

    function parseForSpecificVenue(msg) {
        debug("Generic lunch request detected");
        var query = msg.match[0] + "";
        debug("Parsing for specific venue, from: '" + query + "'");
        var askingForCafe = (/cafe/i).test(query);
        var askingForTruck = (/truck/i).test(query);
        var noSpecificVenue = !askingForCafe && !askingForTruck;
        debug("asking for cafe: " + askingForCafe + ", asking for truck: " + askingForTruck);
        debug("specific venue requested: " + !!noSpecificVenue);
        if (askingForCafe || noSpecificVenue)
            fetchCafeMenu(msg);
        if (askingForTruck || noSpecificVenue)
            fetchFoodTruck(msg);
    }
    
    function debug(debugMsg) {
//        console.log(debugMsg);
    }

    function fetchCafeMenu(msg) {
        debug("CAFE: handling cafe menu request");
        var thisMonday = getThisMonday();
        var dayOfWorkWeek = getDayOfWorkWeek();
        var menuPath = "9PEU5T~" + thisMonday + "/$file/day" +
            dayOfWorkWeek + ".htm";
        var todaysMenuUrl = "http://dining.guckenheimer.com/clients/servicenowsd/fss/fss.nsf/weeklyMenuLaunch/" +
            menuPath;

        debug("CAFE: Using menu URL: " + todaysMenuUrl);
        robot.http(todaysMenuUrl).get()(function (err, res, body) {
            var menuDom, menuHtml, menuPlainText;
            if (res.statusCode != 200) {
                debug("CAFE: Made request, but status code is error: " + res.statusCode);
                msg.send("Not sure what's for lunch, can't get cafe menu :(");
            } else {
                debug("CAFE: Made request, response status 200");

                menuDom = cheerio.load(body);
                menuHtml = menuDom("#center_text");

                debug("CAFE: Cheerio found menu element: " + !!menuHtml);
                debug("CAFE: Cheerio extracted html from menu element: " + menuHtml.html());

                menuPlainText = formatMenuMarkupAsPlainText(menuHtml.html() + "");
                menuPlainText = removeBreakFastFromFormattedMenu(menuPlainText);
                debug("CAFE: Html-to-text massaged into plain text: " + menuPlainText);
                msg.send("/quote The Surf and Saddle Cafe is serving:\n\n" + menuPlainText);
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
        debug("FOODTRUCK: handling food truck request");
        var foodTruckUrl = "http://sdfoodtrucks.com/";
        robot.http(foodTruckUrl).get()(function (err, res, body) {
            var truckListingDom, trucksTodayNode, dateStampNode, eastGateTrucks = [];
            if (res.statusCode != 200) {
                debug("FOODTRUCK: Made request, but status code is error: " + res.statusCode);
                msg.send("Not sure what's for lunch, can't get truck listing :(");
            } else {
                debug("FOODTRUCK: Made request, response status 200");
                truckListingDom = cheerio.load(body);
                trucksTodayNode = truckListingDom(".entry-content ul").first();
                dateStampNode = truckListingDom(".published").first();
                cheerio("li", trucksTodayNode).each(function () {
                    var truckListingNode = cheerio(this);
                    var truckName;
                    if ((/bridgepoint|4[78][0-9]0 eastgate ?mall/i).test(truckListingNode.html() + "")) {
                        truckName = cheerio("strong", truckListingNode).text();
                        eastGateTrucks.push(truckName);
                    }
                });
                if (eastGateTrucks.length) {
                    msg.send("/quote The Eastgate food truck listing for " +
                        dateStampNode.text() + ":\n\n" + eastGateTrucks.join("\n"));
                } else {
                    msg.send("No trucks listed today at " + foodTruckUrl);
                }
            }
        });
    }

    return handler;
}());