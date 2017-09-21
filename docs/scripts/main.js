/**
 * The Variable Babble
 */

window.Babble = {
    currentMessage: '',
    userInfo: {
        name: '',
        email: ''
    },
    register: function (userInfo) {
        Babble.userInfo.name = userInfo.name;
        Babble.userInfo.email = userInfo.email;
        Babble.F.UpdateLS();
        Babble.F.SendMessages();
        Babble.F.request2({
            method: 'POST',
            action: Babble.F.getAction() + '/register'
        }, function (data) {
            console.log('welcome ' + (userInfo.name == '' ? 'Anonymous' : userInfo.name) + '!');
            //Babble.F.SendMessages();
        });
    },
    postMessage: function (message, callback) {
        Babble.currentMessage = message.message;
        Babble.F.UpdateLS();
        Babble.F.request2({
            method: 'POST',
            action: Babble.F.getAction() + '/messages',
            data: JSON.stringify(message)
        }, callback);
    },
    getMessages: function (counter, callback) {
        Babble.F.request2({
            method: 'GET',
            action: Babble.F.getAction() + '/messages?counter=' + counter,
            data: ''
        }, callback);
    },
    deleteMessage: function (id, callback) {
        Babble.F.request2({
            method: 'DELETE',
            action: Babble.F.getAction() + '/messages/' + id
        }, callback);
    },
    getStats: function (callback) {
        Babble.F.request2({
            method: 'GET',
            action: Babble.F.getAction() + '/stats',
            data: ''
        }, callback);
    },
    F: {
        Save: function () {
            var form = document.querySelector('.Section--login form');
            var data = Babble.F.serializeToJS(form);
            Babble.register(data);
            //Babble.F.SendMessages();
        },
        StayAnonymous: function () {
            Babble.register({
                name: '',
                email: ''
            });
            //Babble.F.SendMessages();
        },
        getLSBabble: function () {
            return JSON.parse(localStorage.getItem('babble'));
        },
        UpdateLS: function () {
            localStorage.setItem('babble', JSON.stringify(Babble.F.getRelevantFromBabble()));
        },
        test: function (method, action, data, callback) {
            Babble.F.request2({
                method: method,
                action: Babble.F.getAction() + action,
                data: data
            }, callback);
        },
        afterTest: function (data) {
            console.log('after test: ' + JSON.stringify(data));
        },
        logout: function () {
            console.log('logout');
            Babble.F.request2({
                method: 'POST',
                action: Babble.F.getAction() + '/logout'
            }, function (data) {
                var babble = Babble.F.getLSBabble();
                if (!babble || (babble.userInfo.name === '' && babble.userInfo.email === '')) {
                    babble = {
                        userInfo: {
                            name: '',
                            email: ''
                        },
                        currentMessage: ''
                    };
                    babble.userInfo.name = babble.userInfo.email = babble.userInfo.currentMessage = '';
                    localStorage.setItem('babble', JSON.stringify(babble));
                }
            });
        },
        timestampExsits: function (messages) {
            var curs = Babble.F.getCurrentMessages();
            for (var i = 0; i < messages.length; i++) {
                var t = messages[i].timestamp;
                for (var j = 0; j < curs.length; j++) {
                    if (curs[j].timestamp == t) {
                        return true;
                    }
                }
            }
            return false;
        },
        UpdateMessages: function (data) {
            /*
            var response = e.target.responseText;
            console.log('response: ' + response);
            */
            var messages = data;
            var counter = Babble.F.getCurrentMessages().length;
            if (messages.length == 1 && messages[0].noChange == 'noChange') {
                Babble.getMessages(counter, Babble.F.UpdateMessages);
            } else {
                if (counter != 1 && messages.length == 0) {
                    Babble.getMessages(counter, Babble.F.UpdateMessages);
                } else {
                    if (Babble.F.isDelete(messages, counter)) { // handle delete
                        counter = messages.length;
                        Babble.F.AddMessages(messages, true);
                        Babble.getMessages(counter, Babble.F.UpdateMessages);
                    } else { // simple addition
                        Babble.F.AddMessages(messages, false);
                        counter += messages.length;
                        Babble.getMessages(counter, Babble.F.UpdateMessages);
                    }
                }
            }
        },
        AfterDelete: function (data) {
            console.log('--after delete');
            console.log('--after delete: ' + JSON.stringify(data));
        },
        login: function () {
            Babble.F.request2({
                method: 'POST',
                action: Babble.F.getAction() + '/login'
            }, function (data) {
                console.log('login successfuly');
                Babble.F.updateStats(data);
                Babble.getMessages(0, Babble.F.UpdateMessages);
                Babble.getStats(Babble.F.updateStatsPoll);
            });
        },
        SendMessages: function () {
            Babble.F.login();
            window.addEventListener('beforeunload', function (e) {
                e.preventDefault();
                Babble.F.logout();
            });
            document.querySelector('.Section--login').style.display = 'none';
            document.querySelector('footer textarea').removeAttribute('tabindex');
            document.querySelector('footer button').removeAttribute('tabindex');
            console.log('start send messages!');
            var form = document.querySelector('footer form');
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var message = {
                    name: Babble.F.getLSBabble().userInfo.name,
                    email: Babble.F.getLSBabble().userInfo.email,
                    message: form.elements[0].value,
                    timestamp: Date.now()
                }
                Babble.postMessage(message,
                    function (data) {
                        //var response = e.target.responseText;
                        var id = data.id;
                        console.log('message got id: ' + id);
                    });
            });
        },
        getRelevantFromBabble: function () {
            var babble = {
                currentMessage: Babble.currentMessage,
                userInfo: {
                    name: Babble.userInfo.name,
                    email: Babble.userInfo.email
                }
            }
            return babble;
        },
        updateStats: function (data) {
            document.querySelector('.Header--mainHeader dl > dd:first-of-type').innerHTML = data.messages;
            document.querySelector('.Header--mainHeader dl > dd:last-of-type').innerHTML = data.users;
        },
        updateStatsPoll: function (data) {
            var stats = data;
            Babble.F.updateStats(stats);
            Babble.getStats(Babble.F.updateStatsPoll);
        },
        getCurrentMessages: function () {
            var res = [];
            var list = document.querySelectorAll('main ol li');
            for (var i = 0; i < list.length; i++) {
                var li = list[i];
                res.push({
                    timestamp: li.querySelector('span.timestamp').innerHTML
                });
            }
            return res;
        },
        isDelete: function (messages, counter) { // messages: new messages, counter: number of messages when the request was sent
            var n = messages.length;
            if (counter == 0) return false;
            if (n != counter - 1) return false;
            if (counter != 2) {
                if (n == 1) return false;
                else return true;
            }
            // so we got 2 messages and we get a new one. is it new?
            var currentMessages = Babble.F.getCurrentMessages();
            var newTime = messages[0].timestamp;
            if (newTime > currentMessages[0].timestamp && newTime > currentMessages[1].timestamp) {
                return false;
            } else {
                return true;
            }
        },
        DeleteButtons: function () {
            var list = document.querySelectorAll('main ol li');
            var i = 0;
            while (i < list.length) {
                var button = list[i].querySelector('button');
                Babble.F.SetImgSrc(list[i]);
                if (button != null) {
                    button.addEventListener('click', Babble.F.bindClick(parseInt(list[i].querySelector('span.id').innerHTML)));
                }
                i++;
            }
        },
        bindClick: function (i) {
            return function () {
                console.log('Babble.deleteMessage(' + i + ')');
                Babble.deleteMessage(i, Babble.F.AfterDelete);
            };
        },
        SetImgSrc: function (li) {
            var name = li.querySelector('span.name').innerHTML;
            var email = li.querySelector('span.email').innerHTML;
            var isAnonymous = Babble.F.IsAnonymous(name, email);
            if (!isAnonymous) {
                Babble.F.request2({
                    method: 'GET',
                    action: Babble.F.getAction() + '/md5?email=' + email,
                }, function (data) {
                    li.querySelector('img').setAttribute('src', 'https://www.gravatar.com/avatar/' + data);
                });
            }
        },
        MD5: function (email) {
            var res;
            console.log('res: ' + res);
            Babble.F.request2({
                method: 'GET',
                action: Babble.F.getAction() + '/md5?email=' + email,
                data: ''
            }, function (data) {
                console.log('md5: ' + data);
                res = data;
            });
            console.log('res: ' + res);
            return res;
        },
        IsAnonymous: function (name, email) {
            return (name === '' && email === '');
        },
        AddMessages: function (messages, isDelete) {
            var str = '';
            var ui = Babble.F.getLSBabble().userInfo;
            for (var i = 0; i < messages.length; i++) {
                var message = messages[i];
                var isMe = (message.name == ui.name && message.email == ui.email);
                var isAnonymous = Babble.F.IsAnonymous(message.name, message.email);
                if (isAnonymous) {
                    str += Babble.F.MessageToString(message, isMe, isAnonymous, 'images/anonymous.png');
                } else {
                    str += Babble.F.MessageToString(message, isMe, isAnonymous, 'images/transparent.png');
                }
            }
            var ol = document.querySelector('main ol');
            if (isDelete) {
                ol.innerHTML = str;
            } else {
                ol.innerHTML = ol.innerHTML + str;
            }
            Babble.F.DeleteButtons();
        },
        MessageToString: function (message, isMe, isAnonymous, imgSrc) {
            var str = '<li class="u-flexContainerXStart"> '
                + ' <img src="' + imgSrc + '" alt="" /> '
                + ' <container tabindex="0" class="Container--message"> '
                + '  <cite>' + (isAnonymous ? 'Anonymous' : message.name) + '</cite><span class="timestamp" style="display: none;">' + message.timestamp + '</span><time datetime="UNIX">' + Babble.F.parseTime(message.timestamp) + '</time> '
                + (isMe ? '  <button aria-label="delete message" class="u-visuallyHidden u-focusable delete-icon Button--clickable Button--noStyle"></button> ' : '')
                + '  <p>' + Babble.F.ParseTextMessage(message.message) + '</p> '
                + '  <span class="id" style="display: none;">' + message.id + '</span> '
                + '  <span class="name" style="display: none;">' + message.name + '</span> '
                + '  <span class="email" style="display: none;">' + message.email + '</span> '
                + ' </container> '
                + '</li> ';
            return str;
        },
        ParseTextMessage: function (message) {
            var rows = message.split(/\r?\n/);
            var res = rows[0];
            for (var i = 1; i < rows.length; i++) {
                res += '<br/>' + rows[i];
            }
            return res;
        },
        parseTime: function (milis) {
            var d = new Date();
            var sec = (milis / 1000 - d.getTimezoneOffset() * 60) % 86400;
            var h = parseInt(sec / 3600);
            var m = parseInt((sec / 60) % 60);
            var s = parseInt(sec % 60);
            h = h < 10 ? '0' + h : h;
            m = m < 10 ? '0' + m : m;
            s = s < 10 ? '0' + s : s;
            return h + ':' + m;
        },
        getAction: function () {
            return 'http://localhost:9000';
        },
        request: function (props, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open(props.method, props.action);
            if (props.method === 'post') {
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            }
            xhr.addEventListener('load', function (e) {
                callback(e);
            });
            xhr.send(props.data);
        },
        request2: function (props, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open(props.method, props.action);
            if (props.method === 'post') {
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            }
            xhr.addEventListener('load', function (e) {
                if (e.target.responseText == '') {
                    console.log('empty response');
                } else if (callback) {
                    callback(JSON.parse(e.target.responseText));
                }
            });
            xhr.send(props.data);
        },
        serializeToJS: function (form) {
            var data = {};
            for (var i = 0; i < form.elements.length; i++) {
                var element = form.elements[i];
                if (element.name) {
                    data[element.name] = element.value;
                }
            }
            return data;
        }
    },
    script: function () {
        console.log('hello from client');
        if (typeof (Storage) !== "undefined") {
            if (localStorage.getItem('babble') == null) {
                Babble.F.UpdateLS();
            } else {
                Babble.userInfo.name = Babble.F.getLSBabble().userInfo.name;
                Babble.userInfo.email = Babble.F.getLSBabble().userInfo.email;
            }
            if (Babble.F.getLSBabble().userInfo.email != '' || Babble.F.getLSBabble().userInfo.name != '') {
                console.log('you don\'t need to register');
                Babble.F.SendMessages();
            }
            document.addEventListener('submit', function (e) {
                e.preventDefault();
            });
            SetTextArea3();
            //SetTextArea2();
            SetDl();
            SetMessages();

            function SetDl() {
                SetDlHeight();
                window.addEventListener('resize', SetDlHeight); // window.onresize = SetDlHeight;
                function SetDlHeight() {
                    var dl = document.querySelector('dl');
                    var hasClass = (dl.className != '');
                    if (window.matchMedia("(min-width: 320px)").matches) {
                        if (!hasClass) {
                            dl.className = 'u-flexContainerY';
                        }
                    } else {
                        if (hasClass) {
                            dl.className = '';
                        }
                    }
                }
            }
            function SetMessages() {
                SetMessagesLayout();
                window.addEventListener('resize', SetMessagesLayout); // window.onresize = SetDlHeight;
                function SetMessagesLayout() {
                    var list = document.querySelectorAll('main ol li');
                    if (list == null || list.length == 0) return;
                    var hasClass = (list[0].className != '');
                    if (window.matchMedia("(min-width: 320px)").matches) {
                        if (!hasClass) {
                            for (var i = 0; i < list.length; i++) {
                                list[i].className = 'u-flexContainerXStart';
                            }
                        }
                    } else {
                        if (hasClass) {
                            for (var i = 0; i < list.length; i++) {
                                list[i].className = '';
                            }
                        }
                    }
                }
            }
            function SetTextArea3() {
                // Based on: https://alistapart.com/article/expanding-text-areas-made-elegant
                makeGrowable(document.querySelector('.js-growable'));
                function makeGrowable(container) {
                    var area = container.querySelector('textarea');
                    var clone = container.querySelector('span');
                    var c=0;
                    window.addEventListener('load',UpdateTextArea);
                    area.addEventListener('input', function (e) {
                        UpdateTextArea();
                    });
                    window.addEventListener('resize', function () {
                        UpdateTextArea();
                    });
                    function UpdateTextArea() {
                        clone.textContent = area.value;
                        //ExtraStuff();
                    }
                    function ExtraStuff() {
                        var totalHeight = document.querySelector('body').clientHeight;
                        var firstHeaderHeight = document.querySelector('body > header').clientHeight;
                        var mainHeaderHeight = document.querySelector('.Header--mainHeader').clientHeight;
                        var restHeight = firstHeaderHeight + mainHeaderHeight;
                        var footerHeight = document.querySelector('footer').clientHeight;
                        var main = document.querySelector('main');
                        console.log('counter: '+(c++)+'\n'+
                            'totalHeight: '+totalHeight+'\n'+
                            'restHeight: '+restHeight+'\n'+
                            '- firstHeaderHeight: '+firstHeaderHeight+'\n'+
                            '- mainHeaderHeight: '+mainHeaderHeight+'\n'+
                            'mainHeight: '+main.clientHeight+'\n'+
                            'footerHeight: '+footerHeight+'\n'
                        );
                        var expectedHeight = totalHeight - restHeight - footerHeight;
                        var mic = 0.15; // mainImportanceCoefficient
                        if (expectedHeight > mic * totalHeight) {
                            console.log('- T! expectedHeight > mic * totalHeight: '+expectedHeight+' > '+mic+' * '+totalHeight);
                            SetMaxHeight(300);
                            main.style.height = (expectedHeight)+'px';
                        } else {
                            console.log('- F! expectedHeight > mic * totalHeight: '+expectedHeight+' < '+mic+' * '+totalHeight);
                            SetMaxHeight((1-mic)*totalHeight-restHeight);
                            main.style.height = (mic * totalHeight)+'px';
                        }
                    }
                    function SetMaxHeight(valInPixels) {
                        var val = (valInPixels)+'px';
                        document.querySelector('.Growable textarea').style.maxHeight = val;
                        document.querySelector('.Growable pre').style.maxHeight = val;
                    }
                }
            }

            function SetTextArea2() {
                var area = document.querySelector('textarea');
                var main = document.querySelector('main');
                area.addEventListener('input', UpdateHeights, false);
                window.addEventListener('resize', UpdateHeights);
                function UpdateHeights() {
                    var n = max(5, GetRows());
                    SetHeights(n);
                }
                function GetRows() {
                    return area.value.split(/\r?\n/).length;
                }
                function SetHeights(n) {
                    var textOk = true;
                    var areaHeight = min(300, 14 + 16 * (n));
                    var totalHeight = window.document.body.clientHeight;
                    console.log('totalHeight = ' + totalHeight);
                    area.style.height = areaHeight + 'px';
                    main.style.height = (totalHeight * 0.5 - 1.0 * areaHeight) + 'px';
                }
            }



            function SetTextArea() {
                var area = document.querySelector('textarea');
                var main = document.querySelector('main');
                var footer = document.querySelector('footer');
                UpdateHeights();
                area.addEventListener('input', UpdateHeights, false);
                window.addEventListener('resize', UpdateHeights); //window.onresize = UpdateHeights;
                function UpdateHeights() {
                    var n = max(5, GetRows());
                    SetHeights(n);
                }

                function GetRows() {
                    return area.value.split(/\r?\n/).length;
                }

                function SetHeights(n) {
                    //console.log('height: '+window.document.body.clientHeight);
                    var restHeight = document.querySelector('body > header:first-of-type').clientHeight + document.querySelector('.Header--mainHeader').clientHeight;//window.document.body.clientHeight * 0.75;
                    var areaHeight = min(300, 14 + 16 * (n));
                    if (areaHeight + restHeight > 0.8 * window.document.body.clientHeight) {
                        //console.log('if!');
                        main.style.height = 0.15 * window.document.body.clientHeight;
                        //area.style.height = 0.8*window.document.body.clientHeight - restHeight;
                        //console.log('set maxHeight: '+(0.8*window.document.body.clientHeight - restHeight));
                        area.style.maxHeight = (0.7 * window.document.body.clientHeight - restHeight) + 'px';
                    } else {
                        //console.log('else!');
                        main.style.height = (window.document.body.clientHeight - restHeight - 1 - areaHeight) + 'px';
                        area.style.height = (14 + 16 * (n)) + 'px';
                    }
                }
            }
            function max(x, y) { return x > y ? x : y; }
            function min(x, y) { return x < y ? x : y; }
        }
    }
}

Babble.script();