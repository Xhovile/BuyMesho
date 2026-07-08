const fs = require('fs');
const pg = require('pg');
const url = require('url');

const config = {
    user: "avnadmin",
    password: "<redacted>",
    host: "buymesho-buymesho-1.a.aivencloud.com",
    port: 10285,
    database: "defaultdb",
    ssl: {
        rejectUnauthorized: true,
        ca: `-----BEGIN CERTIFICATE-----
MIIERDCCAqygAwIBAgIUQvZtKSQZfHiRVEDU+yHzyLydZ5EwDQYJKoZIhvcNAQEM
BQAwOjE4MDYGA1UEAwwvOTk2NWI0ZDUtMTA5ZC00ODY1LWEwMTYtNDI3NjU1OGIx
OGQ1IFByb2plY3QgQ0EwHhcNMjYwNzA4MTQ1MzUwWhcNMzYwNzA1MTQ1MzUwWjA6
MTgwNgYDVQQDDC85OTY1YjRkNS0xMDlkLTQ4NjUtYTAxNi00Mjc2NTU4YjE4ZDUg
UHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCCAYoCggGBAO4vP+JH
RX44/M9Bn2VXq72dc8jRo/vC3bWf/IaVDSp13DSpVTI0GL/+zA5jeNgbleDsUXvP
ymIOEiwqJKiKODEsXkDIPbrBGt31jdJVarH88o5kJxlzi0LqIfN28Gt10/BqQiOZ
zMshnQcik2Ycj4r+ORTZ2sj1kRmUjY379ahLYRblBrmxne8Edbk9rqyb1P/MqVM8
k5yYxlHllTBJaBNnCf+YDnUpMXSe29uHpviTQhKPYikM5d9zwh7B/Zx9vMOcFpr7
kWXrlnr2H4rFOacAGF9d6w+xfwZ46MxxLYyQOaNp2nG7+dA/TwE1sszxuKIQzW9A
upTiVaK9UP2UnStOWEuyaJSeaGYw6Qtr/6g/ePwEAM1BjzN/05knZFKwuM8mxa5F
GdXwmfra+30vHohjPXTC+1tORaFAjHZkzCYGMgmb/oPYO4+56T1xn7+LTDeagH84
cdIETcNWYmfxEQfSOT0WiMMKPvjrvTkzMV0MbcdkU3xXAeiW/eAHVsIctQIDAQAB
o0IwQDAdBgNVHQ4EFgQUfBvEeVZZ2Ki76KPL8Km5rfh+jdkwEgYDVR0TAQH/BAgw
BgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQADggGBAA/gYG4W/l79
guS9i5V7YwvPlm9hxgouyaRYFn0B1lMbdExvg9McVNwkXrw1QYpO8PLB2N/rQdYI
d/PkGtYc31JaHI5J2WJ/mQhGwFqEECqS+eCNHLxtBLd7FDf85fFih90xSublxfbc
HYIC2GnQihLuewGa/G4O1cVclFRa14q5+pe7fzmpN2R2aUafDcPw1S/Z09h1EKIS
ORKpRECsO5wEqZCF/h4vqD9CVdm+8efEGoBfhLYHfSxzn4y3w4o+olVu+zRhe2W6
5l+HsviNauljaE++rsgKgDnn7B1eevLVJdKI+7p5CnlDyj+OoJabFpTl/PNbAaXn
83QXkca/0xhXZnVAHHnjBXI2d31K1yI/k8RD7vuFTGIe00lmRk1is8MKUMZIhcTM
c0/28dlVJL3Eu836OJbE5XF8yQsJ1XTUqOzKxD9kUt0MG94r+NvVCxsTCTw7gkIF
rIL2jAb/hOA5QBXWaoQXg/HRRGxtf/E7sVLiinkR8SlqSrnyNzgIIg==
-----END CERTIFICATE-----`,
    },
};

const client = new pg.Client(config);
client.connect(function (err) {
    if (err)
        throw err;
    client.query("SELECT VERSION()", [], function (err, result) {
        if (err)
            throw err;

        console.log(result.rows[0].version);
        client.end(function (err) {
            if (err)
                throw err;
        });
    });
});
