if (!window.Assets) {
    window.Assets = {};
}

(function() {
_.extend(window.Assets, {
    FacetView: {
        infoBox: '<div class="alert alert-info"><p>Click a facet to remove it from the filter</p><ul class="active-facets"></ul></div>',
        facetT: _.template('<a href=#><b><%= name %></b>: <%= value %></a>'),
        newListButton: '\
       <a class="btn btn-primary" href="#list-creation-diag" data-toggle="modal"> \
            <i class="icon-list-alt icon-white"></i>         \
            Save as a new list                               \
        </a>',
        newTagInput: '\
        <form class="form-inline">  \
         <fieldset class="control-group">  \
          <input class="input-short" type="text" name="tag-name" placeholder="Tag name">  \
         </fieldset>  \
          <button type="submit" class="btn">Add</button> \
       </form>',
        newTagMissingError: '<span class=help-inline>No tag name</span>'
       
    }
});
})();

(function() {
    _.extend(window.Assets, {
        EnrichmentWidget: {
            table: '<table class="table table-bordered table-striped">' +
                 '<thead>' +
                 '  <th>Item</th><th>P-Value</th><th>Matches</th>' +
                 '</thead>' +
                 '</table>',
            rowTemplate: _.template(
            '<tr>' +
            '  <td><a href="<%= item %>"><%= description %></a></td>' + 
            '  <td><%= pvalue %></td>' + 
            '  <td><a class="match-count" href="#"><% print(matches.length) %></a>' + 
            '      <div class="enrichment-matches">' + 
            '       <ul>' +
            '       <% _(matches).each(function(m) { %>' +
            '         <li><%= m %></li>' +
            '       <% }); %>' +
            '       </ul>' +
            '  </td>' +
            '</tr>')
        },
        WidgetView: {
            optionTemplate: _.template('<option value="<%= name %>"><%= title %></option>'),
            content: 
        '<div>' +
        '<h3 class="widget-description"></h3>' + 
        '<div class="apology alert alert-block alert-info">' + 
        ' <h4 class="alert-heading">Wrong List Type</h4>' +
        ' This widget is not compatible with the objects in the selected list.' + 
        ' please choose another widget, or another list. This widget only works' + 
        ' with lists of the following types:' +
        ' <ul class="widget-types"></ul>' +
        '</div>' +
        '<form class="well"> ' + 
        '   <select name="widget">' +
        '   </select>' +
        '   <select name="filter"></select>' +
        '   <select name="correction" class="enrichment-opt">' +
        '     <option selected>Bonferroni</option>' + 
        '     <option>Benjamini and Hochberg</option>' +
        '     <option>Holm-Bonferroni</option>' +
        '     <option><i>none</i></option>' + 
        '   </select>' +
        '   <input type="text" id="max-p-value" class="enrichment-opt" value="0.05">' + 
        '</form>' +
        '<div id="widget-display"></div>'
        }
    });
})();

(function() {
_.extend(window.Assets, {
    QuickSearch: {
        header: '<h1>Quick Search Results</h1>',
        resultsList: '<div class="results-list span9"></div>',
        facetList: '<div class="span2 qs-facets"><h2>Facets</h2><div class="qs-facets-list"></div></div>'
    },
    QuickSearchFacetView: {
        ddTemplate: _.template('<dd><a href="#"><%= val %> (<%= count %>)</a></dd>')
    },
    QuickSearchResultView: {
        template: _.template(
        '<h3><%= type %></h3>' + 
        '<table class="table table-striped table-bordered">' + 
        '<thead><th>Path</th><th>Value</th></thead>' + 
        '<tbody>' + 
        '<% _(fields).each(function(val, path) { %>' + 
        ' <tr><td class="field-name span3"><% print(path.split(".").join(" &gt; ")); %></td><td class="span9"><%= val %></td></tr>' + 
        '<% }); %>' + 
        '</tbody>' + 
        '</table>')
    }
});
})();

(function() {

// Close over these variables.
var buttons = {
    union: "Merge",
    intersection: "Intersect",
    difference: "Difference"
};
var default_button = "Intersect";

_.extend(window.Assets, {

    DashBoardHeader: {
        listOperations: _.template(
'<div class=btn-group id=list-aggregate-buttons>                         \
    <a class="disabled needs-input btn" href=# id="combine-main">         \
      <%= defaultButton %>                                               \
    </a>                                                                 \
    <a class="btn dropdown-toggle disabled needs-input"                  \
       data-toggle="dropdown" href=#>                                    \
       <span class=caret></span>                                         \
    </a>                                                                 \
    <ul class=dropdown-menu>                                             \
    <% _(buttons).each(function(title, id) { %>                          \
      <li>                                                               \
        <a class="disabled needs-input" href=# id="combine-by-<%= id %>"> \
          <%= title %>                                                   \
        </a>                                                             \
      </li>                                                              \
    <% }); %>                                                            \
    </ul>                                                                \
</div>', {buttons: buttons, defaultButton: default_button}),
        deleter: 
'<div class=btn-group>                                          \
    <a class="btn disabled deleter needs-input"                 \
        title="Delete the selected lists"                       \
        data-content="                                          \
Permanently delete the selected lists.                          \
You may only delete lists that belong to you.                   \
These lists are marked with the <i class=icon-user></i> symbol" \
        href="#confirm-delete">                                 \
        Delete                                                  \
        <i class="icon-trash"></i>                              \
    </a>                                                        \
</div>',
        creator: '<a class="btn btn-group" data-toggle="modal" href="#list-upload-diag">'
            + 'Upload<i class="icon-upload"></i></a>',
        selectionButtons: 
'<div class=btn-group id=list-selection-controls>               \
  <a class="btn clearer" title="Deselect the selected lists"    \
     data-content="Click here to unselect all the selected lists\
       below"                                                   \
     href=#>                                                    \
     Clear                                            \
  </a>                                                          \
  <a class="btn toggler" title="Invert Selection" data-content="Select all \
     selected lists, and unselect all currently selected lists"  \
     href=#>                                                     \
     Toggle                                            \
  </a>                                                           \
</div>'
    }
});

})();
