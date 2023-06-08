(function () {
  return {
    type: 'module',
    name: 'add',
    request: function (data, input, libs) {
       
        
        var request = libs.axios.get('http://localhost:8080/example/calc/add/'
          + data.sum1 + '/' + data.sum2,
          {
            params: {
              modifier1: input.offset,
              modifier2: input.invert
            }
          });
      return request;
    },
    dataInNames: ['sum1', 'sum2'],
    dataInSchema: {
        type: 'object',
        properties: {
            sum1: {
                type: 'number'
            },
            sum2: {
                type: 'number'
            }
        },
        required: ['sum1','sum2']
    },
    dataOutSchema: {
        type: 'number'        
    },
    dataOutNames: ['result'],
    inputNames: ['offset', 'invert']
  }
})();