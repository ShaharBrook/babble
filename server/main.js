var http = require('http');
var urlUtil = require('url');
var queryUtil = require('querystring');
var fs = require('fs');
var messages = require('./messages-util.js');

var users = 0; // number of users
var clients = []; // pairs of requests and responses of messages

var requestCounter = 0;
var server = http.createServer(function (request, response) {
    setTimeout(function () {
        var output = '--------------------------------------------------';
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", 'GET,OPTIONS,POST,DELETE');
        var URL = request.url;
        var method = request.method;
        if (!UrlExists(URL)) {
            console.log('---- !!!!!!!!!!!stop!!!!!!!!!!!!!!! -----');
            response.writeHead(404);
            response.end();
            return;
        }
        console.log('--- requestCounter: ' + (requestCounter++) + " method: " + method + " URL: " + URL + ' ---');
        if (method === 'GET') {
            var url = urlUtil.parse(request.url);
            console.log('method = GET');
            if (URL.startsWith('/messages')) { // handle getMessages
                if (URL.startsWith('/messages?counter=')) {
                    var data = queryUtil.parse(url.query);
                    var c = data.counter;
                    var serverCounter = messages.getLength();
                    console.log('handle getMessages(' + c + ')');
                    console.log('clientCounter = ' + c + ' , serverCounter = ' + serverCounter);
                    if (isNaN(c) || countInstances(URL, '=') !== 1) {
                        response.writeHead(400);
                        response.end();
                    } else if (c != serverCounter) {
                        console.log('response with messages');
                        response.writeHead(200);
                        response.end(JSON.stringify(messages.getMessages2(c)));
                    } else {
                        console.log('request is pushed');
                        clients.push({
                            request: request,
                            response: response
                        });
                    }
                } else {
                    response.writeHead(400);
                    response.end();
                }
            } else if (URL === '/stats') {
                console.log('handle stats - push request');
                clients.push({
                    request: request,
                    response: response
                });
            } else if (URL.startsWith('/md5?email=')) {
                var data = queryUtil.parse(url.query);
                var md5 = MD5(data.email);
                response.writeHead(200);
                response.end(JSON.stringify(md5));
            } else {
                response.writeHead(405);
                response.end();
            }
        } else if (method === 'POST') {
            var requestBody = '';
            request.on('data', function (chunk) {
                requestBody += chunk.toString();
            });
            request.on('end', function () {
                console.log('method = POST');
                if (URL === '/login') { // handle login
                    console.log('handle login');
                    users++;
                    FlushClients(false);
                    response.writeHead(200);
                    response.end(JSON.stringify({
                        users: users,
                        messages: messages.getLength()
                    }));
                } else if (URL === '/logout') { // handle logout
                    console.log('handle logut');
                    users--;
                    FlushClients(false);
                    response.writeHead(200);
                    response.end(JSON.stringify('logout'));
                } else if (URL === '/register') { // handle registration
                    console.log('handle registration');
                    response.writeHead(200);
                    response.end(JSON.stringify('register'));
                } else if (URL === '/messages') { // handle message
                    try {
                        var data = JSON.parse(requestBody);
                        console.log('handle message');
                        var message = {
                            name: data.name,
                            email: data.email,
                            message: data.message,
                            timestamp: data.timestamp,
                        }
                        if (message.name === undefined || message.email === undefined || message.message === undefined || message.timestamp === undefined ||
                            isNaN(message.timestamp) || Object.getOwnPropertyNames(data).length != 4) {
                            response.writeHead(400);
                            response.end();
                            return;
                        }
                        var id = messages.addMessage(message);
                        FlushClients(false);
                        response.writeHead(200);
                        response.end(JSON.stringify({ id: id }));
                    } catch (e) {
                        response.writeHead(400);
                        response.end();
                    }
                } else {
                    response.writeHead(405);
                    response.end();
                }
            });
        } else if (method === 'DELETE') {
            console.log('!!!!!!!!!!!!!!!!!!got the DELETE request');
            if (URL.startsWith('/messages/')) {
                console.log('handle delete');
                var data = URL.substring(10);
                console.log('method = ' + method + ', data: ' + data);
                console.log('isNaN(data): ' + isNaN(data));

                if (isNaN(data)) {
                    console.log('------ ' + data + ' is Not A Number ' + isNaN(data));
                    response.writeHead(400);
                    response.end('false');
                } else if (messages.doesIdExist(data)) {
                    console.log('------ id ' + data + ' exists!');
                    messages.deleteMessage(data);
                    FlushClients(true);
                    response.writeHead(200);
                    response.end('true');
                } else {
                    console.log('------ id ' + data + ' doesn\'t exist!');
                    response.writeHead(200);
                    response.end('false');
                }
            } else {
                response.writeHead(405);
                response.end();
            }

        }
        else if (method === 'OPTIONS') {
            console.log('!!!!!!!!!!!!!!!!!got the OPTIONS request');
            response.writeHead(204);
            response.end();
        } else {
            console.log('ELSE: method = ' + method);
            response.writeHead(405);
            response.end();
        }
    }, 0);
});

setInterval(function () {
    // respond to each request
    FlushClients(false, true);
}, 30 * 1000);

function FlushClients(isDelete, noChange) {
    while (clients.length > 0) {
        var client = clients.pop();
        var _request = client.request, _response = client.response;
        var _url = urlUtil.parse(_request.url);
        var _URL = _request.url;
        var _data = queryUtil.parse(_url.query);
        console.log('*** flush: ' + _URL);
        if (_URL.startsWith('/messages?counter=')) { // handle getMessages
            if (isDelete) {
                _response.writeHead(200);
                _response.end(JSON.stringify(messages.getMessages2(0)));
            } else if (noChange) {
                _response.writeHead(200);
                _response.end(JSON.stringify([{ noChange: 'noChange' }]));
            } else {
                var _c = _data.counter;
                _response.writeHead(200);
                _response.end(JSON.stringify(messages.getMessages2(_c)));
            }
        } else if (_URL == '/stats') {
            _response.writeHead(200);
            _response.end(JSON.stringify({
                users: users,
                messages: messages.getLength()
            }));
        }
    }
}

function UrlExists(URL) {
    if (URL.startsWith('/messages') || URL === '/stats' || URL.startsWith('/md5?email=')) {
        return true;
    }
    if (URL === '/login' || URL === '/logout' || URL === '/register' || URL === '/messages') {
        return true;
    }
    if (URL.startsWith('/messages/')) {
        return true;
    }
    return false;
}

function countInstances(string, word) {
    var substrings = string.split(word);
    return substrings.length - 1;
}

server.listen(9000);
console.log('listening...');

/**
 * MD5 Hashing
 */

var MD5 = function (string) {

    function RotateLeft(lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }

    function AddUnsigned(lX, lY) {
        var lX4, lY4, lX8, lY8, lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }
        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            } else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        } else {
            return (lResult ^ lX8 ^ lY8);
        }
    }

    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }

    function FF(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };

    function GG(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };

    function HH(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };

    function II(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };

    function ConvertToWordArray(string) {
        var lWordCount;
        var lMessageLength = string.length;
        var lNumberOfWords_temp1 = lMessageLength + 8;
        var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
        var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        var lWordArray = Array(lNumberOfWords - 1);
        var lBytePosition = 0;
        var lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    };

    function WordToHex(lValue) {
        var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
        }
        return WordToHexValue;
    };

    function Utf8Encode(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    };

    var x = Array();
    var k, AA, BB, CC, DD, a, b, c, d;
    var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    var S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    string = Utf8Encode(string);

    x = ConvertToWordArray(string);

    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

    for (k = 0; k < x.length; k += 16) {
        AA = a; BB = b; CC = c; DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
        d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
        c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
        b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
        a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
        d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
        c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
        b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
        a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
        d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
        c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
        b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
        a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
        d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
        c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
        b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
        a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
        d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
        c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
        b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
        a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
        d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
        c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
        b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
        a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
        d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
        c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
        b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
        a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
        d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
        c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
        b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
        a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
        d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
        c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
        b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
        a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
        d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
        c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
        b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
        a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
        d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
        c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
        b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
        a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
        d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
        c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
        b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
        a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
        d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
        c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
        b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
        a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
        d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
        c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
        b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
        a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
        d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
        c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
        b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
        a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
        d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
        c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
        b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
        a = AddUnsigned(a, AA);
        b = AddUnsigned(b, BB);
        c = AddUnsigned(c, CC);
        d = AddUnsigned(d, DD);
    }

    var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);

    return temp.toLowerCase();
}