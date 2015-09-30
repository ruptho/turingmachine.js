// ------------------------------- UI-Tools -------------------------------

var markup = function (element, text) {
  var inline = function (t) {
    var v = $("<div></div>").text(t).html();
    v = v.replace(/(\W|^)\*((\w|_|:|\s)+)?\*(\W)/g, "$1<em>$2</em>$4");
    v = v.replace(/\((.*?)\)\[([^\]]+)\]/g, "<a href='$2'>$1</a>");
    return v;
  };

  var ul = null;
  for (var i in text) {
    if (/^\* /.exec(text[i])) {
      if (!ul) {
        ul = $("<ul></ul>");
        element.append(ul);
      }
      ul.append($("<li></li>").html(inline(text[i].substr(2))));
    } else {
      element.append($("<p></p>").html(inline(text[i])));
      ul = null;
    }
  }

  return element;
}