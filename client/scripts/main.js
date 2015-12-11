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
  	xmlhttp.onreadystatechange = function() {
  	  if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
  	    words = JSON.parse(xmlhttp.responseText);
  	  }
  	};
  	xmlhttp.open('GET', 'words.json', true);
  	xmlhttp.send();
  }

});

function replaceRandomGuff() {
	var wordArray = Object.keys(words);

	var randomNumber = Math.floor(Math.random() * (wordArray.length - 1)) + 1;

	var randomWord = words[wordArray[randomNumber]];

	var randomGuffElement = document.getElementsByClassName('random-guff')[0];

	var randomGuffClone = randomGuffElement.cloneNode(true);

	var word = randomGuffClone.children[1];
	var details = randomGuffClone.children[2];
	var definition = details.children[0].children[1];
	var usageExample = details.children[1];
	var relatedWordsElement = details.children[2];

	word.href = randomWord.slug + '/';
	word.innerHTML = randomWord.word + '&raquo;';
	definition.innerText = randomWord.definition;
	usageExample.innerText = randomWord.usageexample;

	if (randomWord.relatedwords) {
		var relatedWords = randomWord.relatedwords;
		var newRelatedWordsElement = document.createElement('p');
		newRelatedWordsElement.className = 'detail relatedwords';
		newRelatedWordsElement.innerHTML = 'Related: ';

		for(var relatedWord of relatedWords) {
			var relatedWordElement = document.createElement('a');
			relatedWordElement.href = relatedWord.slug + '/';
			relatedWordElement.innerHTML = relatedWord.word;
			newRelatedWordsElement.appendChild(relatedWordElement);
		}
		if (relatedWordsElement) {
			relatedWordsElement = newRelatedWordsElement;
		} else {
			details.appendChild(newRelatedWordsElement);
		}
	} else {
		relatedWordsElement.remove()
	}
	randomGuffElement.innerHTML = randomGuffClone.innerHTML;

}
