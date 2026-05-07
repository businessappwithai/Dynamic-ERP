/**
 * BusLabResult List Controller - Entity Table (Column 2)
 *
 * Dedicated list controller for Bus Lab Result entity.
 * Dynamically generates table columns from sys_field metadata.
 * Columns are ordered by seq_no_grid for runtime customization.
 * Supports quick search (client-side) and advanced search (server-side).
 *
 * Generated: 2026-03-09T11:47:10.459Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/m/Column",
  "sap/m/ColumnListItem",
  "sap/m/Text",
  "sap/m/Link",
  "sap/m/ObjectNumber",
  "sap/m/ObjectStatus",
  "sap/m/CheckBox",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/model/type/Date",
  "sap/ui/model/type/DateTime",
  "sap/ui/model/type/Float"
], function(
  Controller, JSONModel, Filter, FilterOperator, Sorter,
  Column, ColumnListItem, Text, Link, ObjectNumber, ObjectStatus, CheckBox,
  MessageToast, MessageBox, DateType, DateTimeType, FloatType
) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusLabResultList", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: true,
        itemCount: 0,totalCount: 0,
        entityName: "bus_lab_result",
        entityDisplayName: "Bus Lab Result",
        entitySetName: "LabResultSet",
        searchQuery: "",
        advancedSearchVisible: false,
        fields: [],
        selectionColumns: []
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busLabResultListRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      this._loadEntityData();
    },

    _loadEntityData: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      oViewModel.setProperty("/busy", true);

      // Load field metadata from sys_field
      this._loadFieldMetadata().then(function(aFields) {
        oViewModel.setProperty("/fields", aFields);

        // Extract selection columns for advanced search
        var aSelectionCols = aFields.filter(function(f) { return f.is_selection_column; });
        oViewModel.setProperty("/selectionColumns", aSelectionCols);

        this._buildTableColumns(aFields);
        this._bindTableItems(sEntitySet);
        oViewModel.setProperty("/busy", false);
      }.bind(this)).catch(function() {
        this._buildDefaultColumns();
        this._bindTableItems(sEntitySet);
        oViewModel.setProperty("/busy", false);
      }.bind(this));
    },

            _fetchTotalCount: function(sEntitySet) {
      var oViewModel = this.getView().getModel("view");
      var oModel = this.getOwnerComponent().getModel();
      var sServiceUrl = oModel.sServiceUrl;
      
      // Use fetch to get the count directly from OData endpoint
      fetch(sServiceUrl + sEntitySet + "/$count", {
        method: "GET",
        headers: {
          "Accept": "text/plain",
          "Content-Type": "application/json"
        }
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("Failed to fetch count");
        }
        return response.text();
      })
      .then(function(sCount) {
        var iCount = parseInt(sCount) || 0;
        oViewModel.setProperty("/totalCount", iCount);
      })
      .catch(function(oError) {
        console.error("Error fetching total count:", oError);
        oViewModel.setProperty("/totalCount", 0);
      });
    },

    _loadFieldMetadata: function() {
      var that = this;
      return new Promise(function(resolve, reject) {
        try {
          var oModel = that.getOwnerComponent().getModel();
          if (!oModel) {
            resolve(that._getFieldsFromMetadata());
            return;
          }

          // Check if SysFields entity set exists in model
          var oMetaModel = oModel.getMetaModel();
          if (!oMetaModel) {
            resolve(that._getFieldsFromMetadata());
            return;
          }

          // Use default metadata - SysFields entity is not exposed in OData service
          resolve(that._getFieldsFromMetadata());
        } catch (oError) {
          // Silently use default metadata on any error
          resolve(that._getFieldsFromMetadata());
        }
      });
    },

    _getFieldsFromMetadata: function() {
      var aFields = [];
      aFields.push({
        column_name: "test_date",
        display_name: "Test Date",
        data_type: "date",
        seq_no_grid: 20,
        is_displayed_grid: true,
        is_selection_column: false
      });
      aFields.push({
        column_name: "test_name",
        display_name: "Test Name",
        data_type: "string",
        seq_no_grid: 30,
        is_displayed_grid: true,
        is_selection_column: false
      });
      aFields.push({
        column_name: "test_value",
        display_name: "Test Value",
        data_type: "string",
        seq_no_grid: 40,
        is_displayed_grid: true,
        is_selection_column: false
      });
      aFields.push({
        column_name: "reference_range",
        display_name: "Reference Range",
        data_type: "string",
        seq_no_grid: 50,
        is_displayed_grid: true,
        is_selection_column: false
      });
      aFields.push({
        column_name: "is_abnormal",
        display_name: "Is Abnormal",
        data_type: "boolean",
        seq_no_grid: 60,
        is_displayed_grid: true,
        is_selection_column: false
      });
      aFields.push({
        column_name: "performed_by",
        display_name: "Performed By",
        data_type: "string",
        seq_no_grid: 70,
        is_displayed_grid: true,
        is_selection_column: false
      });
      aFields.push({
        column_name: "notes",
        display_name: "Notes",
        data_type: "text",
        seq_no_grid: 80,
        is_displayed_grid: true,
        is_selection_column: false
      });
      return aFields;
    },

    _buildTableColumns: function(aFields) {
      var oTable = this.byId("entityTable");
      if (!oTable) return;
      oTable.destroyColumns();

      aFields.forEach(function(oField) {
        oTable.addColumn(new Column({
          header: new Text({ text: oField.display_name || oField.column_name }),
          demandPopin: true,
          minScreenWidth: oField.seq_no_grid <= 30 ? "" : "Tablet"
        }));
      }.bind(this));

      this._aFields = aFields;
    },

    _buildDefaultColumns: function() {
      var aDefaults = [
        { column_name: "test_date", display_name: "Test Date", data_type: "date", seq_no_grid: 20 },
        { column_name: "test_name", display_name: "Test Name", data_type: "string", seq_no_grid: 30 },
        { column_name: "test_value", display_name: "Test Value", data_type: "string", seq_no_grid: 40 },
        { column_name: "reference_range", display_name: "Reference Range", data_type: "string", seq_no_grid: 50 },
        { column_name: "is_abnormal", display_name: "Is Abnormal", data_type: "boolean", seq_no_grid: 60 },
        { column_name: "performed_by", display_name: "Performed By", data_type: "string", seq_no_grid: 70 },
        { column_name: "notes", display_name: "Notes", data_type: "text", seq_no_grid: 80 },
      ];
      this._buildTableColumns(aDefaults);
    },

    _bindTableItems: function(sEntitySet) {
      var oTable = this.byId("entityTable");
      if (!oTable) return;
      var aFields = this._aFields || [];

      var oCellTemplate = new ColumnListItem({
        type: "Navigation",
        press: this.onItemPress.bind(this)
      });

      aFields.forEach(function(oField) {
        oCellTemplate.addCell(this._createCellControl(oField));
      }.bind(this));

      oTable.bindItems({
        path: "/" + sEntitySet,
        parameters: { $count: true },
        template: oCellTemplate,
        templateShareable: false,
        events: { dataReceived: this.onDataReceived.bind(this) }
      });
    },

    _createCellControl: function(oField) {
      var sCol = oField.column_name;
      var sType = oField.data_type || "string";

      switch (sType) {
        case "boolean":
          return new CheckBox({ selected: "{" + sCol + "}", enabled: false });
        case "integer":
          return new ObjectNumber({ number: "{" + sCol + "}" });
        case "decimal":
          return new ObjectNumber({ number: { path: sCol, type: new FloatType({ decimals: 2 }) } });
        case "date":
          return new Text({ text: "{" + sCol + "}" });
        case "datetime":
          return new Text({ text: "{" + sCol + "}" });
        default:
          if (sCol === "status" || sCol.endsWith("_status")) {
            return new ObjectStatus({
              text: "{" + sCol + "}",
              state: { path: sCol, formatter: this._formatStatusState }
            });
          }
          return new Text({ text: "{" + sCol + "}" });
      }
    },

    _formatStatusState: function(sStatus) {
      if (!sStatus) return "None";
      var s = sStatus.toLowerCase();
      if (s === "active" || s === "approved" || s === "complete") return "Success";
      if (s === "pending" || s === "draft") return "Warning";
      if (s === "inactive" || s === "rejected" || s === "error") return "Error";
      return "None";
    },

    onDataReceived: function(oEvent) {
      var nCount = oEvent.getSource().getLength();
      this.getView().getModel("view").setProperty("/itemCount", nCount);
    },

        onItemPress: function(oEvent) {
      var oSource = oEvent.getSource();
      var oContext = oSource.getBindingContext();

      if (!oContext) {
        // For selectionChange event, get parameter instead
        var oListItem = oEvent.getParameter("listItem");
        if (oListItem) {
          oContext = oListItem.getBindingContext();
        }
      }

      if (!oContext) {
        MessageToast.show("Could not get binding context");
        return;
      }

      var sId = oContext.getProperty("id") || oContext.getProperty("bus_lab_result_id");
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busLabResultDetailRoute", { id: sId }); };
    },

    // Quick Search (client-side filtering of loaded data)
    onQuickSearch: function(oEvent) {
      var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
      var oTable = this.byId("entityTable");
      var oBinding = oTable.getBinding("items");

      if (sQuery && sQuery.length > 0) {
        var aFilters = [];
        (this._aFields || []).forEach(function(f) {
          if (f.data_type === "string" || !f.data_type) {
            aFilters.push(new Filter(f.column_name, FilterOperator.Contains, sQuery));
          }
        });
        if (aFilters.length > 0) {
          oBinding.filter(new Filter({ filters: aFilters, and: false }));
        }
      } else {
        oBinding.filter([]);
      }
    },

    // Toggle advanced search panel visibility
    onToggleAdvancedSearch: function() {
      var oViewModel = this.getView().getModel("view");
      var bVisible = oViewModel.getProperty("/advancedSearchVisible");
      oViewModel.setProperty("/advancedSearchVisible", !bVisible);
    },

    // Advanced Search (server-side via OData $filter)
    onAdvancedSearch: function() {
      var oView = this.getView();
      var sField = oView.byId("advSearchField") ? oView.byId("advSearchField").getSelectedKey() : "";
      var sOperator = oView.byId("advSearchOperator") ? oView.byId("advSearchOperator").getSelectedKey() : "Contains";
      var sValue = oView.byId("advSearchValue") ? oView.byId("advSearchValue").getValue() : "";

      if (!sField || !sValue) {
        MessageToast.show("Please select a field and enter a search value");
        return;
      }

      var oTable = this.byId("entityTable");
      var oBinding = oTable.getBinding("items");
      oBinding.filter([new Filter(sField, FilterOperator[sOperator], sValue)]);
    },

    onClearAdvancedSearch: function() {
      var oTable = this.byId("entityTable");
      var oBinding = oTable.getBinding("items");
      oBinding.filter([]);

      var oView = this.getView();
      if (oView.byId("advSearchValue")) {
        oView.byId("advSearchValue").setValue("");
      }
    },

    onCreatePress: function() {
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busLabResultCreateRoute"); };
    },

    onRefresh: function() {
      var oTable = this.byId("entityTable");
      var oBinding = oTable.getBinding("items");
      if (oBinding) oBinding.refresh();
    },

    onNavBack: function() {
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("master"); };
    },
    _getRouter: function() {
      var oComponent = this.getOwnerComponent();
      if (!oComponent) {
        console.error("Owner component not available in " + this.getMetadata().getName());
        MessageToast.show("Navigation not available");
        return null;
      }
      return oComponent.getRouter();
    },
  });
});
