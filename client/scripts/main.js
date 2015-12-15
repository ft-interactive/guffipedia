import oHoverable from 'o-hoverable';
import attachFastClick from 'fastclick';

let words = {};

document.addEventListener('DOMContentLoaded', () => {
  // make hover effects work on touch devices
  oHoverable.init();

  // remove the 300ms tap delay on mobile browsers
  attachFastClick(document.body);

  if (page === 'main' && document.documentElement.className === 'enhanced') {
    let xmlhttp;
    if (window.XMLHttpRequest) {
      xmlhttp = new XMLHttpRequest();
    } else {
      xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
    }
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
  let wordArray = Object.keys(words);

  let randomNumber = Math.floor(Math.random() * (wordArray.length - 1)) + 1;

  while (words[wordArray[randomNumber]].slug === document.querySelector('.latest-guff').id) {
    randomNumber = Math.floor(Math.random() * (wordArray.length - 1)) + 1;
  }

  const randomWord = words[wordArray[randomNumber]];

  const randomGuffElement = document.querySelector('.random-guff');

  let randomGuffClone = randomGuffElement.cloneNode(true);

  randomGuffClone.setAttribute('style', 'visibility: visible;');

  let refreshButton = randomGuffClone.querySelector('.refresh');

  if (!refreshButton) {
    refreshButton = document.createElement('span');
    refreshButton.className = 'refresh';
    randomGuffClone.querySelector('.paraHeads').appendChild(refreshButton);
  }

  refreshButton.addEventListener('click', () => {
    newRandomGuff();
  });

  let word = randomGuffClone.querySelector('.word');
  let details = randomGuffClone.querySelector('.details');
  const definition = details.querySelector('.detail.definition');
  const usageExample = details.querySelector('.detail.usageexample');
  const relatedWordsElement = details.querySelector('.detail.relatedwords');

  word.href = randomWord.slug + '/';
  word.innerHTML = randomWord.word + '&raquo;';

  if (definition) {
    details.removeChild(definition);
  }
  if (randomWord.definition) {
    let newDefinitionElement = document.createElement('p');

    newDefinitionElement.className = 'detail definition';
    newDefinitionElement.innerHTML = '<strong>Translation into plain English</strong> ' + randomWord.definition;

    details.appendChild(newDefinitionElement);
  }

  if (usageExample) {
    details.removeChild(usageExample);
  }
  if (randomWord.usageexample) {
    let newUsageExampleElement = document.createElement('p');

    newUsageExampleElement.className = 'detail usageexample';
    newUsageExampleElement.innerHTML = randomWord.usageexample;

    details.appendChild(newUsageExampleElement);
  }

  if (relatedWordsElement) {
    details.removeChild(relatedWordsElement);
  }
  if (randomWord.relatedwords.length > 0) {
    let newRelatedWordsElement = document.createElement('p');

    newRelatedWordsElement.className = 'detail relatedwords';
    newRelatedWordsElement.innerHTML = 'Related: ';

    const relatedWords = randomWord.relatedwords;
    for (const relatedWord of relatedWords) {
      let relatedWordElement = document.createElement('a');
      relatedWordElement.href = relatedWord.slug + '/';
      relatedWordElement.innerHTML = relatedWord.word;
      if (relatedWords.indexOf(relatedWord) > 0) {
        newRelatedWordsElement.innerHTML += ', ';
      }
      newRelatedWordsElement.appendChild(relatedWordElement);
    }

    details.appendChild(newRelatedWordsElement);
  }
  document.querySelector('main').insertBefore(randomGuffClone, randomGuffElement);
  document.querySelector('main').removeChild(randomGuffElement);
}
