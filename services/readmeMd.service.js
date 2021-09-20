function getLogoUrl($, dpDetails) {
    if ($('div[id = "readme"]').find("p").find("a").attr("href")) {
        var logo1 = $('div[id = "readme"]').find("p").find("a").attr("href");
        if (logo1 != undefined) {
            var logoUrl = logo1.split("@")[1];
            dpDetails.logoUrl = "https://www." + logoUrl;
        }
    } else if ($('div[class = "snippet-clipboard-content position-relative"]:contains("Maintainer")')
        .find("pre")
        .find("code")
    ) {
        var logo2 = $(
            'div[class = "snippet-clipboard-content position-relative"]:contains("Maintainer")'
        )
            .find("pre")
            .find("code")
            .text();
        if (logo2 != undefined) {
            var logoUrl = logo2.split("@")[1];
            dpDetails.logoUrl = "https://www." + logoUrl;
        }
    } else {
        var logo3 = $('div[id = "readme"]')
            .find("ul")
            .find('li:contains("Maintainer")')
            .find("code")
            .text();
        if (logo3 != undefined) {
            dpDetails.logoUrl = "https://www." + logo3;
        }
    }
}

module.exports = {
    getLogoUrl: getLogoUrl,
};
