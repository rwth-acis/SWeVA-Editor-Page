(function () {
    return {
        type: 'module',
        name: 'localAdd',
        compute: function (data, input, libs) {
            var result = data.sum1 + data.sum2;
            result += input.offset;
            if (input.invert) {
                result *= -1;
            }
            return result;
        },
        dataInNames: ['sum1', 'sum2'],
        dataOutNames: ['result'],
        inputNames: ['offset', 'invert']
    }
})();