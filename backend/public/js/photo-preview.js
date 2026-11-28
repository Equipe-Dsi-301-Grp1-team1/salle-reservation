
(function () {
  var box = document.getElementById('photo-uploader');
  var input = document.getElementById('photo-input');
  if (!box || !input) {
    return;
  }

  var preview = document.getElementById('photo-preview');
  var errorBox = document.getElementById('photo-error');
  var submit = document.getElementById('photo-submit');
  var remaining = Number(box.dataset.remaining);
  var maxSize = Number(box.dataset.maxSize);
  var allowed = ['image/jpeg', 'image/png', 'image/webp'];

  function showError(text) {
    errorBox.textContent = text;
    errorBox.hidden = !text;
  }

  function clearPreview() {
    var images = preview.querySelectorAll('img');
    for (var i = 0; i < images.length; i++) {
      URL.revokeObjectURL(images[i].src);
    }
    preview.innerHTML = '';
  }

  input.addEventListener('change', function () {
    clearPreview();
    showError('');
    submit.disabled = false;

    var files = Array.prototype.slice.call(input.files);
    var problem = '';

    if (files.length > remaining) {
      problem = 'Vous pouvez encore ajouter ' + remaining + ' photo(s) au maximum.';
    }
    files.forEach(function (file) {
      if (allowed.indexOf(file.type) === -1) {
        problem = '« ' + file.name + ' » n’est pas au format JPEG, PNG ou WebP.';
      } else if (file.size > maxSize) {
        problem = '« ' + file.name + ' » dépasse 5 Mo.';
      }
    });

    if (problem) {
      showError(problem);
      submit.disabled = true;
      return;
    }

    files.forEach(function (file) {
      var item = document.createElement('figure');
      item.className = 'photo-preview-item';
      var img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = 'Aperçu de ' + file.name;
      var caption = document.createElement('figcaption');
      caption.textContent = file.name;
      item.appendChild(img);
      item.appendChild(caption);
      preview.appendChild(item);
    });
  });
})();
