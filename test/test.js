// var assert = require('assert');
// describe('Array', function() {
//   describe('#indexOf()', function() {
//     it('should return -1 when the value is not present', function() {
//       assert.equal(-1, [1,2,3].indexOf(4));
//     });
//   });
// });
/*
'use strict';

const assert = require('chai').assert;
const Babble = require('../client/scripts/main').Babble;

describe('Babble',function() {
    it('should exists Babble',function() {
        assert.typeOf(Babble.currentMessage,'string');
    });
});
*/

'use strict';

let window = require('../client/scripts/main.js').window;
let assert = window.chai.assert;
let sinon = window.sinon;
let Babble = window.Babble;

describe('LocalStorage', function() {
  it('should have one key named babble in json format', function() {
    let keys = Object.keys(localStorage);
    assert.equal(keys.length, 1);
    assert.deepEqual(keys, ['babble']);

    let data = localStorage.getItem('babble');
    assert.doesNotThrow(JSON.parse.bind(JSON, data));
  });
  it('should have mandatory keys', function() {
    let data = JSON.parse(localStorage.getItem('babble'));
    assert.exists(data.userInfo);
    assert.exists(data.currentMessage);
    assert.exists(data.userInfo.name);
    assert.exists(data.userInfo.email);
  });
});