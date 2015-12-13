import oHoverable from 'o-hoverable';
import attachFastClick from 'fastclick';

var words = {};

document.addEventListener('DOMContentLoaded', () => {
  // // make hover effects work on touch devices
  oHoverable.init();

  // // remove the 300ms tap delay on mobile browsers
  attachFastClick(document.body);

  if (document.documentElement.className === 'enhanced') {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
        words = JSON.parse(xmlhttp.responseText);
        newRandomGuff();
      }
    };
    xmlhttp.open('GET', 'words.json', true);
    xmlhttp.send();
  }

});

function newRandomGuff() {
  var wordArray = Object.keys(words);

  var randomNumber = Math.floor(Math.random() * (wordArray.length - 1)) + 1;

  while (words[wordArray[randomNumber]].slug === document.getElementsByClassName('latest-guff')[0].id) {
    randomNumber = Math.floor(Math.random() * (wordArray.length - 1)) + 1;
  }

  var randomWord = words[wordArray[randomNumber]];

  var randomGuffElement = document.getElementsByClassName('random-guff')[0];

  var randomGuffClone = randomGuffElement.cloneNode(true);

  randomGuffClone.setAttribute('style', 'visibility: visible;');

  var refreshButton = randomGuffClone.getElementsByClassName('refresh')[0];

  if (!refreshButton) {
    refreshButton = document.createElement('span');
    refreshButton.className = 'refresh';
    randomGuffClone.getElementsByClassName('paraHeads')[0].appendChild(refreshButton);
  }

  refreshButton.addEventListener('click', () => {
    newRandomGuff();
  });

  var word = randomGuffClone.getElementsByClassName('word')[0];
  var details = randomGuffClone.getElementsByClassName('details')[0];
  var definition = details.getElementsByClassName('detail definition')[0];
  var usageExample = details.getElementsByClassName('detail usageexample')[0];
  var relatedWordsElement = details.getElementsByClassName('detail relatedwords')[0];

  word.href = randomWord.slug + '/';
  word.innerHTML = randomWord.word + '&raquo;';

  if (definition) {
    details.removeChild(definition);
  }
  if (randomWord.definition) {
    var newDefinitionElement = document.createElement('p');

    newDefinitionElement.className = 'detail definition';
    newDefinitionElement.innerHTML = '<strong>Translation into plain English</strong> ' + randomWord.definition;

    details.appendChild(newDefinitionElement);
  }

  if (usageExample) {
    details.removeChild(usageExample);
  }
  if (randomWord.usageexample) {
    var newUsageExampleElement = document.createElement('p');

    newUsageExampleElement.className = 'detail usageexample';
    newUsageExampleElement.innerHTML = randomWord.usageexample;

    details.appendChild(newUsageExampleElement);
  }

  if (relatedWordsElement) {
    details.removeChild(relatedWordsElement);
  }
  if (randomWord.relatedwords.length > 0) {
    var newRelatedWordsElement = document.createElement('p');

    newRelatedWordsElement.className = 'detail relatedwords';
    newRelatedWordsElement.innerHTML = 'Related: ';

    var relatedWords = randomWord.relatedwords;
    for (var relatedWord of relatedWords) {
      var relatedWordElement = document.createElement('a');
      relatedWordElement.href = relatedWord.slug + '/';
      relatedWordElement.innerHTML = relatedWord.word;
      if (relatedWords.indexOf(relatedWord) > 0) {
        newRelatedWordsElement.innerHTML += ', ';
      }
      newRelatedWordsElement.appendChild(relatedWordElement);
    }

    details.appendChild(newRelatedWordsElement);
  }
  document.getElementsByTagName('main')[0].insertBefore(randomGuffClone, randomGuffElement);
  document.getElementsByTagName('main')[0].removeChild(randomGuffElement);
}
