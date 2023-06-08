var tape = require("tape"),
    d3 = Object.assign({}, require("d3-array"), require("../"));

require("./isNaN");

tape("entries(object) enumerates every entry", function(test) {
  test.deepEqual(d3.entries({a: 1, b: 2}).sort(ascendingKey), [{key: "a", value: 1}, {key: "b", value: 2}]);
  test.end();
});

tape("entries(object) includes entries defined on prototypes", function(test) {
  function abc() {
    this.a = 1;
    this.b = 2;
  }
  abc.prototype.c = 3;
  test.deepEqual(d3.entries(new abc).sort(ascendingKey), [{key: "a", value: 1}, {key: "b", value: 2}, {key: "c", value: 3}]);
  test.end();
});

tape("entries(object) includes null, undefined and NaN values", function(test) {
  var v = d3.entries({a: null, b: undefined, c: NaN}).sort(ascendingKey);
  test.equal(v.length, 3);
  test.equal(v[0].key, "a");
  test.equal(v[0].value, null);
  test.equal(v[1].key, "b");
  test.equal(v[1].value, undefined);
  test.equal(v[2].key, "c");
  test.isNaN(v[2].value);
  test.end();
});

function ascendingKey(a, b) {
  return d3.ascending(a.key, b.key);
}
