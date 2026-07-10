/*
 * Carrega conteúdo editável (texto/imagens) de um arquivo JSON e popula o HTML.
 * Convenção de campos:
 *   data-field="caminho.no.json"       -> define innerHTML (suporta \n -> <br> e *texto* -> <em>texto</em>)
 *   data-field-src="caminho.no.json"   -> define atributo src (imagens)
 *   data-field-href="caminho.no.json"  -> define atributo href
 *   data-list="caminho.array"          -> contêiner de lista repetida; o primeiro
 *                                          descendente [data-list-item] serve de modelo
 *                                          e é clonado uma vez por item do array.
 */
(function () {
  function get(obj, path) {
    if (!path || path === '.') return obj;
    return path.split('.').reduce(function (o, k) { return (o || {})[k]; }, obj);
  }

  function parseInline(str) {
    if (str == null) return '';
    // Escapa "&" solto, mas preserva entidades HTML já existentes no texto (ex: &#9711; &amp;)
    var esc = String(str)
      .replace(/&(?!#\d+;|#x[0-9a-fA-F]+;|[a-zA-Z]+;)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    esc = esc.replace(/\n/g, '<br>');
    esc = esc.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return esc;
  }

  function queryIncludingSelf(root, selector) {
    var result = root.querySelectorAll ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
    if (root.matches && root.matches(selector)) result.unshift(root);
    return result;
  }

  function applyScalarFields(root, data) {
    queryIncludingSelf(root, '[data-field]').forEach(function (el) {
      var val = get(data, el.getAttribute('data-field'));
      if (val != null) el.innerHTML = parseInline(val);
    });
    queryIncludingSelf(root, '[data-field-src]').forEach(function (el) {
      var val = get(data, el.getAttribute('data-field-src'));
      if (val) el.setAttribute('src', val);
    });
    queryIncludingSelf(root, '[data-field-href]').forEach(function (el) {
      var val = get(data, el.getAttribute('data-field-href'));
      if (val) el.setAttribute('href', val);
    });
  }

  function applyLists(data) {
    document.querySelectorAll('[data-list]').forEach(function (container) {
      var items = get(data, container.getAttribute('data-list'));
      if (!Array.isArray(items)) return;

      var templateSrc = container.querySelector('[data-list-item]');
      if (!templateSrc) return;
      var template = templateSrc.cloneNode(true);
      container.innerHTML = '';

      var repeat = parseInt(container.getAttribute('data-list-repeat') || '1', 10);
      for (var r = 0; r < repeat; r++) {
        items.forEach(function (item, idx) {
          var clone = template.cloneNode(true);
          clone.style.transitionDelay = (idx * 0.1) + 's';
          applyScalarFields(clone, item);
          container.appendChild(clone);
        });
      }
    });
  }

  function init() {
    var path = document.body.getAttribute('data-content');
    if (!path) return;
    fetch(path)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        applyScalarFields(document, data);
        applyLists(data);
        document.dispatchEvent(new CustomEvent('content-loaded'));
      })
      .catch(function (err) {
        console.error('Falha ao carregar conteúdo:', path, err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
