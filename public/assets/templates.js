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
    </a>                                                        \
</div>',
        selectionButtons: 
'<div class=btn-group id=list-selection-controls>               \
  <a class="btn clearer" title="Deselect the selected lists"    \
     data-content="Click here to unselect all the selected lists\
       below"                                                   \
     href=#>                                                    \
     Clear Selection                                            \
  </a>                                                          \
  <a class="btn toggler" title="Invert Selection" data-content="Select all \
     selected lists, and unselect all currently selected lists"  \
     href=#>                                                     \
     Toggle Selection                                            \
  </a>                                                           \
</div>'
    }
});

})();
