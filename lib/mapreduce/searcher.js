var stopwords = require('natural').stopwords;
var simpleOneTokenSearch = require('./simpleOneTokenSearch.js');
var fullSearch = require('./fullSearch.js');
var bloomSearch = require('./bloomSearch.js');

exports.search = function (reverseIndex, docFreqIndex, q, callback) {

  var canBloomSearch = true;
  var cleanQuery = {};
  var canSearch = true;
  var singleTokenNoNavs = false;

  //remove stopwords
  cleanQuery['query'] = [];
  for (k = 0; k < q['query'].length; k++) {
    if (stopwords.indexOf(q['query'][k]) == -1) {
      cleanQuery['query'].push(q['query'][k]);
    }
  }
  if (cleanQuery['query'].length === 0) {
    canSearch = false;
  }

  pickSearch = function(docFreqs) {
    console.log(docFreqs);
    //Check for single token no navs query
    if ((cleanQuery['query'].length == 1) && (!q['navs'])) {
      var singleTokenNoNavs = true;
    }
        
    if (singleTokenNoNavs) {
      simpleOneTokenSearch.search(reverseIndex, docFreqs, docFreqIndex, q, cleanQuery, function(msg) {
        callback(msg);
      });
    }
    else if (canBloomSearch) {
      bloomSearch.search(reverseIndex, docFreqs, q, cleanQuery, function(msg) {
        callback(msg);
      });
    }
    else {
      fullSearch.search(reverseIndex, docFreqIndex, q, function(msg) {
        callback(msg);
      });
    }
  }


  //generate keyset
  var facets = [''];
  var keySet = [];
  if (q.facets) facets = facets.concat(q.facets);
  console.log(facets);
  for (var i = 0; i < facets.length; i++) {
    for (var j = 0; j < cleanQuery.query.length; j++) {
      keySet.push(cleanQuery.query[j] + '~' + facets[i] + '~');
    }
  }
  console.log(keySet);


  
  //Check document frequencies
  var docFreqs = {};
  var docFreq = function (keySet, i) {
    docFreqIndex.createReadStream({
      valueEncoding: 'json',
      limit: 20,
      start: keySet[i],
      end: keySet[i] + '~'})
      .on('data', function (data) {
        docFreqs[data.key] = data.value;
      })
      .on('error', function (err) {
        console.log('Oh my!', err)
      })
      .on('end', function () {
        if (++i < keySet.length)
          docFreq(keySet, i);  
        else pickSearch(docFreqs);
      });

  }
  docFreq(keySet, 0);
};