/* global Y */
'use strict'

function extend (Y) {
  Y.requestModules(['Array']).then(function () {
    class YAce extends Y.Array['class'] {
      constructor (os, _model, idArray, valArray) {
        super(os, _model, idArray, valArray)
        this.instances = []
      }
      get length () {
        /*
          TODO: I must not use observe to compute the length.
          But since I inherit from Y.Array, I can't set observe
          the changes at the right momet (for that I would require direct access to EventHandler).
          This is the most elegant solution, for now.
          But at some time you should re-write Y.Richtext more elegantly!!
        */
        return this.toString().length
      }
      toString () {
        return this.valArray.map(function (v) {
          if (typeof v === 'string') {
            return v
          }
        }).join('')
      }      
      insert (pos, content) {
        var curPos = 0
        var selection = {}
        for (var i = 0; i < this.valArray.length; i++) {
          if (curPos === pos) {
            break
          }
          var v = this.valArray[i]
          if (typeof v === 'string') {
            curPos++
          } else if (v.constructor === Array) {
            if (v[1] === null) {
              delete selection[v[0]]
            } else {
              selection[v[0]] = v[1]
            }
          }
        }
        super.insert(i, content.split(''))
        return selection
      }
      delete (pos, length) {
        /*
          let x = to be deleted string
          let s = some string
          let * = some selection
          E.g.
          sss*s***x*xxxxx***xx*x**ss*s
               |---delete-range--|
             delStart         delEnd

          We'll check the following
          * is it possible to delete some of the selections?
            1. a dominating selection to the right could be the same as the selection (curSel) to delStart
            2. a selections could be overwritten by another selection to the right
        */
        var curPos = 0
        var curSel = {}
        var endPos = pos + length
        if (length <= 0) return
        var delStart // relative to valArray
        var delEnd // ..
        var v, i // helper variable for elements of valArray

        for (delStart = 0, v = this.valArray[delStart]; curPos < pos && delStart < this.valArray.length; v = this.valArray[++delStart]) {
          if (typeof v === 'string') {
            curPos++
          } else if (v.constructor === Array) {
            curSel[v[0]] = v[1]
          }
        }
        for (delEnd = delStart, v = this.valArray[delEnd]; curPos < endPos && delEnd < this.valArray.length; v = this.valArray[++delEnd]) {
          if (typeof v === 'string') {
            curPos++
          }
        }
        if (delEnd === this.valArray.length) {
          // yay, you can delete everything without checking
          for (i = delEnd - 1, v = this.valArray[i]; i >= delStart; v = this.valArray[--i]) {
            super.delete(i, 1)
          }
        } else {
          if (typeof v === 'string') {
            delEnd--
          }
          var rightSel = {}
          for (i = delEnd, v = this.valArray[i]; i >= delStart; v = this.valArray[--i]) {
            if (v.constructor === Array) {
              if (rightSel[v[0]] === undefined) {
                if (v[1] === curSel[v[0]]) {
                  // case 1.
                  super.delete(i, 1)
                }
                rightSel[v[0]] = v[1]
              } else {
                // case 2.
                super.delete(i, 1)
              }
            } else if (typeof v === 'string') {
              // always delete the strings
              super.delete(i, 1)
            }
          }
        }
      }
     
      bind (ace, options) {          
        this.instances.push(ace)
        var self = this

        // this function makes sure that either the
        // quill event is executed, or the yjs observer is executed
        var token = true
        function mutualExcluse (f) {
          if (token) {
            token = false
            try {
              f()
            } catch (e) {
              token = true
              throw new Error(e)
            }
            token = true
          }
        }
        ace.markers = []
        var disableMarkers = false

        if (typeof options === 'object'){
          if (typeof options.disableMarkers !== 'undefined'){
            disableMarkers = options.disableMarkers
          }
        }
          
        
        ace.setValue(this.valArray.join(''))
        
        ace.on('change', function (delta) {
          mutualExcluse(function () {            
            var start = 0
            var length = 0
            
            var aceDocument = ace.getSession().getDocument();
            if (delta.action === 'insert'){
              start = aceDocument.positionToIndex(delta.start, 0)
              self.insert(start, delta.lines.join('\n'))             
            }
            else if (delta.action==='remove'){
              start = aceDocument.positionToIndex(delta.start, 0)
              length = delta.lines.join('\n').length
              self.delete(start, length)              
            }           
            
          })
        })
        
        if(!disableMarkers) {
          if (this.inteval) {
            clearInterval(this.inteval)
          }
          this.inteval = setInterval(function() {
            var i = 0;
            var now = Date.now()
            var timeVisible = 800
            
            while (i < ace.markers.length) {
              var marker = ace.markers[i]
              
              if (marker.timestamp + timeVisible < now){
                ace.getSession().removeMarker(marker.id)
                ace.markers.splice(i, 1)
                i--
              }
              i++
            }
          }, 1000)
        }
        
        function setMarker(start, end, klazz) {
          if (disableMarkers){
            return;
          }
          var offset = 0
          if (start.row === end.row && start.column === end.column){
            offset = 1
          }
          var range = new ace.Range(start.row, start.column, end.row, end.column + offset)                
          var marker = ace.session.addMarker(range, klazz, "text")
          ace.markers.push({id: marker, timestamp: Date.now()})
        }
        
        this.observe(function (events) {
         
          var aceDocument = ace.getSession().getDocument()
          var start = 0
          var end = 0
          mutualExcluse(function () {   
            
            for (var i = 0; i < events.length; i++) {
              var event = events[i]                  
              if (event.type === 'insert') {
                start = aceDocument.indexToPosition(event.index, 0)
                end = aceDocument.indexToPosition(event.index + event.value.length, 0)
                aceDocument.insert(start, event.value)
                
                setMarker(start, end, 'inserted')                
              }
              else if (event.type === 'delete') {
                start = aceDocument.indexToPosition(event.index, 0)
                end = aceDocument.indexToPosition(event.index + event.length, 0)
                var range = new ace.Range(start.row, start.column, end.row, end.column)
                aceDocument.remove(range);
                
                setMarker(start, end, 'deleted')
              }
            }
            
          })
        })
      }
      * _changed () {        
        yield* Y.Array.class.prototype._changed.apply(this, arguments)
      }
    }
    Y.extend('Ace', new Y.utils.CustomType({
      name: 'Ace',
      class: YAce,
      struct: 'List',
      initType: function * YTextInitializer (os, model) {
        var valArray = []
        var idArray = yield* Y.Struct.List.map.call(this, model, function (c) {
          valArray.push(c.content)
          return JSON.stringify(c.id)
        })
        return new YAce(os, model.id, idArray, valArray)
      }
    }))
  })
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}
