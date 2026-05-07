/**
 * BusPatient Detail Controller - Object Page (Column 3)
 *
 * Dedicated detail controller for Bus Patient entity.
 * Displays all fields from sys_field ordered by seq_no.
 * Supports Edit/Delete functionality with ETag concurrency.
 *
 * Generated: 2026-03-09T11:47:10.440Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/format/DateFormat",
  "hospital-management-system/utils/MessageHelper"
], function(Controller, JSONModel, Filter, FilterOperator, Sorter, MessageToast, MessageBox, DateFormat, MessageHelper) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusPatientDetail", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: true,
        editable: false,
        entityName: "bus_patient",
        entityDisplayName: "Bus Patient",
        entitySetName: "PatientSet",
        fields: [],
        currentId: null,
        childTabs: [], // Child tabs hierarchy
        loadedChildData: {}, // Cache for loaded child data
        childUIElements: {} // Map to store UI element references by binding key
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busPatientDetailRoute")
        .attachPatternMatched(this._onRouteMatched, this);

    },

    _onRouteMatched: function(oEvent) {
      var sId = oEvent.getParameter("arguments").id;
      var oViewModel = this.getView().getModel("view");

      // Check if we're navigating to a different patient
      var sOldPatientId = oViewModel.getProperty("/currentId");
      if (sOldPatientId && sOldPatientId !== sId) {
        console.log("[DEBUG] Patient changed from", sOldPatientId, "to", sId);
        // Clear cache for different patient to avoid showing wrong data
        oViewModel.setProperty("/loadedChildData", {});
        // Clear UI element references for different patient
        oViewModel.setProperty("/childUIElements", {});
        console.log("[DEBUG] Cleared child data and UI element cache");
      }

      oViewModel.setProperty("/currentId", sId);
      this._loadRecord(sId);
    },

    _loadRecord: function(sId) {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      oViewModel.setProperty("/busy", true);
      oViewModel.setProperty("/editable", false);

      var oModel = this.getOwnerComponent().getModel();
      var sPath = "/" + sEntitySet + "('" + sId + "')";

      console.log("[DEBUG] Binding view to path:", sPath);

      // Bind element with error handling
      try {
        oView.bindElement({
          path: sPath,
          events: {
          dataReceived: function(oData) {
            console.log("[DEBUG] Data received for binding:", oData);
            oViewModel.setProperty("/busy", false);
          },
          change: function() {
            console.log("[DEBUG] Binding changed");
            oViewModel.setProperty("/busy", false);
          },
          changeReason: function() {
            console.log("[DEBUG] Binding change reason");
          }
          }
        });
      } catch (oError) {
        console.error("[DEBUG] Error binding element:", oError);
        oViewModel.setProperty("/busy", false);
      }

      // Load field metadata
      this._loadFieldMetadata().then(function(aFields) {
        oViewModel.setProperty("/fields", aFields);
        oViewModel.setProperty("/busy", false);
      }.bind(this)).catch(function() {
        oViewModel.setProperty("/busy", false);
      });

      // Load child tabs hierarchy for expandable/collapsible tabs
      this._loadTabHierarchy().then(function(aChildTabs) {
        console.log("[DEBUG] Child tabs loaded:", aChildTabs.length, "tabs");
        console.log("[DEBUG] Tab names:", aChildTabs.map(t => t.name));
        oViewModel.setProperty("/childTabs", aChildTabs);

        // Render after a delay to ensure view is fully loaded
        setTimeout(function() {
          console.log("[DEBUG] About to render child tabs after delay");
          this._renderChildTabs(aChildTabs);
        }.bind(this), 100);
      }.bind(this)).catch(function(oError) {
        console.error("[DEBUG] Failed to load tab hierarchy:", oError);
        // If tab hierarchy fails, use empty array
        oViewModel.setProperty("/childTabs", []);
      }.bind(this));
    },

    _loadFieldMetadata: function() {
      return new Promise(function(resolve, reject) {
        var oViewModel = this.getView().getModel("view");
        var sTableName = oViewModel.getProperty("/entityName");

        if (!sTableName) {
          reject(new Error("Entity name not set in view model"));
          return;
        }

        // Get backend URL from OData model
        var oModel = this.getOwnerComponent().getModel();
        var sServiceUrl = oModel.getServiceUrl();
        var sBackendUrl = sServiceUrl.replace(/\/odata\/?$/, '');

        // Call metadata endpoint to get field metadata
        $.ajax({
          url: sBackendUrl + "/api/metadata/fields/" + sTableName,
          method: "GET",
          dataType: "json",
          success: function(oResponse) {
            if (oResponse && oResponse.fields) {
              var aFields = oResponse.fields.map(function(oField) {
                return {
                  sys_field_id: oField.sys_field_id,
                  name: oField.field_name,
                  display_name: oField.column_display_name || oField.field_name,
                  description: oField.description,
                  is_displayed: oField.is_displayed,
                  is_displayed_grid: oField.is_displayed_grid,
                  is_read_only: oField.is_read_only,
                  is_mandatory: oField.column_is_mandatory,
                  mandatory_logic: oField.mandatory_logic,
                  display_logic: oField.display_logic,
                  read_only_logic: oField.read_only_logic,
                  seq_no: oField.seq_no,
                  column_name: oField.column_name,
                  is_key: oField.is_key,
                  is_parent: oField.is_parent,
                  is_updateable: oField.is_updateable,
                  field_length: oField.field_length,
                  default_value: oField.default_value,
                  value_min: oField.value_min,
                  value_max: oField.value_max,
                  format_pattern: oField.format_pattern,
                  x_position: oField.x_position,
                  y_position: oField.y_position,
                  column_span: oField.column_span,
                  is_heading: oField.is_heading
                };
              });
              resolve(aFields);
            } else {
              var oError = new Error("No fields found for table: " + sTableName);
              console.error(oError.message);
              reject(oError);
            }
          }.bind(this),
          error: function(oXHR, sTextStatus, sError) {
            var oError = new Error("Failed to load field metadata: " + sError);
            console.error("Failed to load field metadata from endpoint:", sError);
            console.error("URL:", sBackendUrl + "/api/metadata/fields/" + sTableName);
            console.error("Response:", oXHR.responseText);
            reject(oError);
          }
        });
      }.bind(this));
    },


    onEditPress: function() {
      this.getView().getModel("view").setProperty("/editable", true);
    },

    onSavePress: function() {
      var oView = this.getView();
      var oModel = this.getOwnerComponent().getModel();
      var oViewModel = oView.getModel("view");
      var oBinding = oView.getBindingContext();

      oViewModel.setProperty("/busy", true);

      // OData V4 uses submitBatch() or resetChanges()
      try {
        // Submit changes via the model's default update group
        oModel.submitBatch("update").then(function() {
          oViewModel.setProperty("/busy", false);
          oViewModel.setProperty("/editable", false);
          MessageHelper.showSuccess("Bus Patient saved successfully");
        }.bind(this)).catch(function(oError) {
          oViewModel.setProperty("/busy", false);
          MessageBox.error("Failed to save: " + (oError.message || "Unknown error"));
        }.bind(this));
      } catch (e) {
        // Fallback: The data is already bound, just refresh
        oViewModel.setProperty("/busy", false);
        oViewModel.setProperty("/editable", false);
        MessageHelper.showSuccess("Changes saved");
      }
    },

    onCancelPress: function() {
      var oModel = this.getOwnerComponent().getModel();
      oModel.resetChanges();
      this.getView().getModel("view").setProperty("/editable", false);
    },

    onDeletePress: function() {
      var that = this;
      MessageBox.confirm("Are you sure you want to delete this Bus Patient?", {
        title: "Confirm Delete",
        onClose: function(sAction) {
          if (sAction === MessageBox.Action.OK) {
            that._deleteRecord();
          }
        }
      });
    },

    _deleteRecord: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oModel = this.getOwnerComponent().getModel();
      var oBinding = oView.getBindingContext();
      var sPath = oBinding.getPath();

      oViewModel.setProperty("/busy", true);

      // OData V4 uses requestOption() to delete
      oModel.requestOption("DELETE", sPath).then(function() {
        oViewModel.setProperty("/busy", false);
        MessageHelper.showSuccess("Bus Patient deleted successfully");
        this.onNavBack();
      }.bind(this)).catch(function(oError) {
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to delete: " + (oError.message || "Unknown error"));
      }.bind(this));
    },

    onNavBack: function() {
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busPatientListRoute"); };
    },

    formatDate: function(oDate) {
      if (!oDate) return "";
      // Handle both date strings and Date objects
      var oDateObj = typeof oDate === "string" ? new Date(oDate) : oDate;
      if (isNaN(oDateObj.getTime())) return "";
      var oDateFormat = DateFormat.getDateInstance({ style: "medium" });
      return oDateFormat.format(oDateObj);
    },

    getInitials: function(sFirstName) {
      if (!sFirstName) return "HMS";
      // Extract initials from first name
      var sInitials = sFirstName.charAt(0).toUpperCase();
      // Use first two letters of first name (OData V4 formatters receive single values, not full context)
      if (sFirstName.length > 1) {
        sInitials = sFirstName.substring(0, 2).toUpperCase();
      }
      return sInitials;
    },

    formatRelatedRecordsTitle: function(sParentEntityName) {
      if (!sParentEntityName) return "Related Records";
      return sParentEntityName + " Relationships";
    },

    formatChildRecordsTitle: function(sParentEntityName) {
      if (!sParentEntityName) return "Related Entities";
      return sParentEntityName + " Related Entities";
    },

    onAnchorBarPressed: function(oEvent) {
      // Handle anchor bar press event
      var sSectionId = oEvent.getParameter("sectionId");
    },

    onSectionChanged: function(oEvent) {
      // Handle section change event
      var sSectionId = oEvent.getParameter("sectionId");
    },

    onFullScreen: function() {
      var oObjectPage = this.getView().byId("objectPageLayout");
      if (oObjectPage) {
        var oDomRef = oObjectPage.getDomRef();
        if (oDomRef && oDomRef.requestFullscreen) {
          oDomRef.requestFullscreen().catch(function(err) {
            console.error("Error attempting to enable fullscreen:", err);
            // Fallback: Use UI5's fullscreen mode
            oObjectPage.setUseWholeLayout(true);
          });
        } else {
          // Fallback for browsers that don't support fullscreen API
          oObjectPage.setUseWholeLayout(true);
        }
      }
    },

    onExitFullScreen: function() {
      var oObjectPage = this.getView().byId("objectPageLayout");
      if (oObjectPage) {
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(function(err) {
            console.error("Error attempting to exit fullscreen:", err);
            // Fallback: Use UI5's fullscreen mode
            oObjectPage.setUseWholeLayout(false);
          });
        } else {
          // Fallback for browsers that don't support fullscreen API
          oObjectPage.setUseWholeLayout(false);
        }
      }
    },

    /**
     * Load tab hierarchy from sys_tab
     * Queries metadata endpoint to get child tabs with proper joins
     * Returns child tabs with tab_level=1 for the parent entity
     */
    _loadTabHierarchy: function() {
      return new Promise(function(resolve, reject) {
        var oViewModel = this.getView().getModel("view");
        var sParentTableName = oViewModel.getProperty("/entityName");

        console.log("[DEBUG] _loadTabHierarchy called for entity:", sParentTableName);

        if (!sParentTableName) {
          console.warn("[DEBUG] No entity name found, resolving with empty array");
          resolve([]);
          return;
        }

        // Get backend URL from OData model (default is http://localhost:3000/odata)
        var oModel = this.getOwnerComponent().getModel();
        var sServiceUrl = oModel.getServiceUrl();
        // Extract base URL (remove /odata suffix and trailing slash)
        var sBackendUrl = sServiceUrl.replace(/\/odata\/?$/, '');

        var sUrl = sBackendUrl + "/api/metadata/child-tabs/" + sParentTableName;
        console.log("[DEBUG] Service URL:", sServiceUrl);
        console.log("[DEBUG] Backend URL:", sBackendUrl);
        console.log("[DEBUG] Fetching child tabs from:", sUrl);

        // Call metadata endpoint to get child tabs
        $.ajax({
          url: sUrl,
          method: "GET",
          dataType: "json",
          cache: false,  // CRITICAL: Disable browser cache to get fresh data
          success: function(oResponse) {
            console.log("[DEBUG] Metadata endpoint response:", oResponse);
            if (oResponse && oResponse.child_tabs) {
              // Store parent entity metadata for dynamic section titles
              oViewModel.setProperty("/parentEntityName", oResponse.parent_entity_name);
              oViewModel.setProperty("/parentEntityDescription", oResponse.parent_entity_description);

              var aChildTabs = oResponse.child_tabs.map(function(oTab) {
                console.log("[DEBUG] Mapping tab:", oTab.name, "with fields:", oTab.fields?.length || 0);
                return {
                  sys_tab_id: oTab.sys_tab_id,
                  name: oTab.name,
                  table_name: oTab.table_name,
                  entity_set_name: oTab.entity_set_name,
                  parent_column_name: oTab.parent_column_name,
                  seq_no: oTab.seq_no,
                  is_loaded: false,
                  data: [],
                  fields: oTab.fields || []  // CRITICAL: Include fields from API response
                };
              });
              console.log("[DEBUG] Mapped child tabs:", aChildTabs.length, "tabs");
              resolve(aChildTabs);
            } else {
              console.warn("[DEBUG] No child_tabs in response for " + sParentTableName);
              resolve([]);
            }
          },
          error: function(oXHR, sTextStatus, sError) {
            console.error("[DEBUG] Failed to load tab hierarchy from metadata endpoint:", sError);
            console.error("[DEBUG] URL:", sUrl);
            console.error("[DEBUG] Response:", oXHR.responseText);
            reject(new Error("Failed to load child tabs: " + sError));
          }
        });
      }.bind(this));
    },

    /**
     * Lazy load child data when tab is expanded
     * @param {string} sTabName - The name of the tab being expanded
     * @param {string} sEntitySetName - The entity set name for the child table
     * @param {string} sParentColumnName - The parent column name for filtering
     */
    _loadChildData: function(sBindingKey, sTabName, sEntitySetName, sParentColumnName) {
      return new Promise(function(resolve, reject) {
        var oViewModel = this.getView().getModel("view");
        var sParentId = oViewModel.getProperty("/currentId");
        var oModel = this.getOwnerComponent().getModel();

        // Check if data is already loaded (use binding key for storage)
        // Only use cache if it contains actual data (not empty array or undefined)
        var sCachePath = "/loadedChildData/" + sBindingKey;
        var oLoadedData = oViewModel.getProperty(sCachePath);
        if (oLoadedData && Array.isArray(oLoadedData) && oLoadedData.length > 0) {
          console.log("[DEBUG] Using cached data for", sBindingKey, ":", oLoadedData.length, "records");
          resolve(oLoadedData);
          return;
        }

        console.log("[DEBUG] Cache miss for", sBindingKey, "- fetching from server");

        // Use OData V4 filter query instead of navigation properties
        // Navigation: /odata/ChildEntitySet?$filter=parent_column eq 'parent_id'
        var sPath = sEntitySetName;
        var sFilterClause = sParentColumnName + " eq '" + sParentId + "'";
        var sFilter = encodeURIComponent("\$filter=" + sFilterClause);
        var sServiceUrl = oModel.getServiceUrl();

        console.log("[DEBUG] Loading child data from:", sServiceUrl);
        console.log("[DEBUG] Parent ID:", sParentId);
        console.log("[DEBUG] Path:", sPath);
        console.log("[DEBUG] Filter:", sFilterClause);
        console.log("[DEBUG] Cache path:", sCachePath);

        // Use fetch API for OData V4 query with properly encoded filter
        // Build URL carefully to avoid double slashes
        var sUrl = sServiceUrl;
        // Remove trailing slash if present
        if (sUrl.endsWith('/')) {
          sUrl = sUrl.slice(0, -1);
        }
        // Add entity set (without leading slash since service URL already has path)
        sUrl = sUrl + "/" + sPath;
        // Add query parameters
        sUrl = sUrl + "?" + sFilter + "&\$top=20";

        console.log("[DEBUG] Full URL:", sUrl);

        fetch(sUrl)
          .then(function(response) {
            if (!response.ok) {
              throw new Error("HTTP " + response.status + ": " + response.statusText);
            }
            return response.json();
          })
          .then(function(oData) {
            var aResults = oData.value || [];
            console.log("[DEBUG] Loaded " + aResults.length + " records for " + sTabName + " from server");
            console.log("[DEBUG] Caching at path:", sCachePath);

            // Cache the loaded data
            oViewModel.setProperty(sCachePath, aResults);

            // Update the tab's loaded status
            var aChildTabs = oViewModel.getProperty("/childTabs");
            var oTab = aChildTabs.find(function(t) { return t.name === sTabName; });
            if (oTab) {
              oTab.is_loaded = true;
              oTab.data = aResults;
              oViewModel.setProperty("/childTabs", aChildTabs);
            }

            resolve(aResults);
          })
          .catch(function(oError) {
            console.error("Failed to load child data for " + sTabName + ":", oError);
            reject(oError);
          });
      }.bind(this));
    },

    /**
     * Event handler when a tab is expanded
     * Triggers lazy loading of child data
     * @param {sap.ui.base.Event} oEvent - The event object
     */
    onTabExpand: function(oEvent) {
      var oSource = oEvent.getSource();
      var sTabName = oSource.data("tabName");
      var sBindingKey = oSource.data("bindingKey");
      var sEntitySetName = oSource.data("entitySetName");
      var sParentColumnName = oSource.data("parentColumnName");

      if (!sTabName || !sEntitySetName || !sParentColumnName) {
        console.error("Missing tab metadata for lazy loading");
        return;
      }

      // Show busy indicator
      var oViewModel = this.getView().getModel("view");
      oViewModel.setProperty("/busy", true);

      // Load child data (use binding key for storage path)
      this._loadChildData(sBindingKey, sTabName, sEntitySetName, sParentColumnName).then(function(aData) {
        oViewModel.setProperty("/busy", false);
        MessageHelper.showInfo("Loaded " + aData.length + " records for " + sTabName);

        // Get UI elements from view model map
        var oUIElements = oViewModel.getProperty("/childUIElements/" + sBindingKey);

        if (oUIElements && oUIElements.tableControl) {
          var oTable = oUIElements.tableControl;

          // Clear existing items
          oTable.removeAllItems();

          // Create table items for each data record
          if (aData && aData.length > 0) {
            // Get field definitions for this tab (use first 5 fields that were used for columns)
            var aFields = (oTab.fields || []).slice(0, 5);

            aData.forEach(function(oRecord) {
              // Create cells for this row
              var aCells = aFields.map(function(oField) {
                var sValue = oRecord[oField.column_name] || "";
                return new sap.m.Text({
                  text: String(sValue),
                  wrapping: false
                });
              });

              // Create list item and add to table
              var oItem = new sap.m.ColumnListItem({
                cells: aCells
              });
              oItem.data("record", oRecord);
              oTable.addItem(oItem);
            });

            oTable.setVisible(true);

            // Update count text to show actual number of records
            if (oUIElements.countText) {
              oUIElements.countText.setText(aData.length + " records");
            }

            // Enable Edit and Delete buttons when data is loaded
            if (oUIElements.editButton) {
              oUIElements.editButton.setEnabled(true);
            }
            if (oUIElements.deleteButton) {
              oUIElements.deleteButton.setEnabled(true);
            }
          } else {
            oTable.setVisible(false);
            // Update count to show 0 records
            if (oUIElements.countText) {
              oUIElements.countText.setText("0 records");
            }
          }
        }
      }.bind(this)).catch(function(oError) {
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to load child data: " + (oError.message || "Unknown error"));
      });
    },

    /**
     * Get formatted child data count for display
     * @param {string} sTabName - The tab name
     * @returns {string} Formatted count string
     */
    getChildDataCount: function(sTabName) {
      var oViewModel = this.getView().getModel("view");
      var aData = oViewModel.getProperty("/loadedChildData/" + sTabName);
      if (!aData || aData.length === 0) {
        return "0";
      }
      return aData.length.toString();
    },

    /**
     * Check if child tab data has been loaded
     * @param {string} sTabName - The tab name
     * @returns {boolean} True if data is loaded
     */
    isChildDataLoaded: function(sTabName) {
      var oViewModel = this.getView().getModel("view");
      var aData = oViewModel.getProperty("/loadedChildData/" + sTabName);
      return aData && aData.length > 0;
    },

    /**
     * Dynamically render child tabs UI
     * Creates expandable sections for each child tab
     * @param {array} aChildTabs - Array of child tab metadata
     */
    _renderChildTabs: function(aChildTabs) {
      console.log("[DEBUG] _renderChildTabs called with", aChildTabs ? aChildTabs.length : 0, "tabs");

      var oView = this.getView();
      var oContainer = oView.byId("childTabsContainer");

      console.log("[DEBUG] View object:", oView);
      console.log("[DEBUG] Container found:", !!oContainer);

      if (!oContainer) {
        console.error("[DEBUG] childTabsContainer not found in view");
        console.error("[DEBUG] Available IDs in view:", this._getAllViewIds(oView));
        return;
      }

      console.log("[DEBUG] Container current items:", oContainer.getItems().length);

      // Clear existing content
      oContainer.destroyItems();
      console.log("[DEBUG] Container cleared");

      if (!aChildTabs || aChildTabs.length === 0) {
        console.warn("[DEBUG] No child tabs to render");
        var oNoDataText = new sap.m.Text({
          text: "No related records configured"
        });
        oContainer.addItem(oNoDataText);
        return;
      }

      console.log("[DEBUG] Creating panels for", aChildTabs.length, "child tabs");

      // Initialize loadedChildData for all child tabs to avoid binding errors
      var oViewModel = this.getView().getModel("view");
      var sCurrentPatientId = oViewModel.getProperty("/currentId");
      aChildTabs.forEach(function(oTab) {
        var sBindingKey = oTab.name.replace(/[^a-zA-Z0-9]/g, '');
        // CRITICAL: Include patient ID in cache key to avoid cross-patient contamination
        var sCacheKey = sBindingKey + "_" + sCurrentPatientId;
        var sPath = "/loadedChildData/" + sCacheKey;
        // Initialize with empty array if not already set
        if (!oViewModel.getProperty(sPath)) {
          oViewModel.setProperty(sPath, []);
          console.log("[DEBUG] Initialized", sPath, "with empty array");
        }
      }.bind(this));

      // Create UI for each child tab
      aChildTabs.forEach(function(oTab, index) {
        try {
          console.log("[DEBUG] Processing tab", index, ":", oTab.name);
          console.log("[DEBUG] Tab has fields?:", !!oTab.fields);
          console.log("[DEBUG] Fields length:", (oTab.fields || []).length);
          console.log("[DEBUG] First 3 fields:", (oTab.fields || []).slice(0, 3));
          console.log("[DEBUG] Creating panel " + index + " for: " + oTab.name + " (Entity: " + oTab.entity_set_name + ")");

          // Create a sanitized key for binding paths (remove spaces and special chars)
          var sBindingKey = oTab.name.replace(/[^a-zA-Z0-9]/g, '');
          console.log("[DEBUG] Binding key for " + oTab.name + ": " + sBindingKey);

          // Create Panel with minimal properties to avoid binding issues
          var oTabPanel = new sap.m.Panel({
            expandable: true,
            expanded: false,
            headerText: oTab.name,
            width: "100%"
            // Removed backgroundDesign to avoid potential enum binding issue
          });
          oTabPanel.addStyleClass("sapUiSmallMarginTop");

          console.log("[DEBUG] Panel created:", oTabPanel, "with headerText:", oTabPanel.getHeaderText());

        // Panel content container
        var oPanelContent = new sap.m.VBox({
          items: []
        });

        // Load button (shows when data not loaded)
        var oLoadButton = new sap.m.Button({
          text: "Load Records",
          icon: "sap-icon://refresh",
          type: "Transparent",
          press: this.onTabExpand.bind(this)
        });
        oLoadButton.data("tabName", oTab.name);
        // CRITICAL: Store cache key (with patient ID) instead of just binding key
        var sCacheKey = sBindingKey + "_" + sCurrentPatientId;
        oLoadButton.data("bindingKey", sCacheKey);
        oLoadButton.data("entitySetName", oTab.entity_set_name);
        oLoadButton.data("parentColumnName", oTab.parent_column_name);

        // Count text (shows record count when loaded)
        var oCountText = new sap.m.Text({
          text: "0 records"
        });

        // Store count text reference for updating later
        oTab.countText = oCountText;

        // Dynamically create table columns based on field metadata
        var aTableColumns = [];
        var aTableCells = [];

        // Use first 5 fields for table display (avoid too many columns)
        var aDisplayFields = (oTab.fields || []).slice(0, 5);

        if (aDisplayFields.length === 0) {
          // Fallback if no field metadata: show basic ID field
          aDisplayFields = [{ column_name: 'id', column_display_name: 'ID' }];
        }

        console.log("[DEBUG] Creating " + aDisplayFields.length + " columns for " + oTab.name);

        // Create columns and cells dynamically
        aDisplayFields.forEach(function(oField) {
          var sColumnName = oField.column_name;
          var sColumnLabel = oField.column_display_name || oField.field_name || sColumnName;

          // Add table column
          var oColumn = new sap.m.Column({
            header: new sap.m.Text({ text: sColumnLabel })
          });
          aTableColumns.push(oColumn);

          // Add cell template (simple text binding for each field)
          // Note: Don't use binding initially - bind when data loads to avoid "startsWith" error
          var oCell = new sap.m.Text({
            text: "",  // Empty initially, will be populated when table binds
            wrapping: false
          });
          aTableCells.push(oCell);
        });

        // Create toolbar with CRUD buttons
        var oCreateButton = new sap.m.Button({
          text: "Add New",
          icon: "sap-icon://add",
          type: "Emphasized",
          press: this.onCreateChildRecord.bind(this)
        });
        oCreateButton.data("tabName", oTab.name);
        oCreateButton.data("bindingKey", sCacheKey);
        oCreateButton.data("entitySetName", oTab.entity_set_name);
        oCreateButton.data("parentColumnName", oTab.parent_column_name);

        console.log("Setting fields data on button for", oTab.name);
        console.log("oTab.fields:", oTab.fields);
        console.log("oTab.fields type:", typeof oTab.fields);
        console.log("oTab.fields length:", (oTab.fields || []).length);
        console.log("oTab.fields is array:", Array.isArray(oTab.fields));

        var fieldsString = JSON.stringify(oTab.fields || []);
        console.log("Stringified fields:", fieldsString);
        console.log("Stringified fields length:", fieldsString.length);

        oCreateButton.data("fields", fieldsString);

        var oEditButton = new sap.m.Button({
          text: "Edit",
          icon: "sap-icon://edit",
          type: "Transparent",
          enabled: false,  // Initially disabled
          press: this.onEditChildRecord.bind(this)
        });
        oEditButton.data("tabName", oTab.name);
        oEditButton.data("bindingKey", sCacheKey);
        oEditButton.data("entitySetName", oTab.entity_set_name);
        oEditButton.data("fields", fieldsString);

        var oDeleteButton = new sap.m.Button({
          text: "Delete",
          icon: "sap-icon://delete",
          type: "Transparent",
          enabled: false,  // Initially disabled
          press: this.onDeleteChildRecord.bind(this)
        });
        oDeleteButton.data("tabName", oTab.name);
        oDeleteButton.data("bindingKey", sCacheKey);
        oDeleteButton.data("entitySetName", oTab.entity_set_name);

        var oToolbar = new sap.m.OverflowToolbar({
          content: [
            oCreateButton,
            oEditButton,
            oDeleteButton,
            new sap.m.ToolbarSpacer()
          ]
        });

        // Table for displaying child records (hidden by default)
        // Create table WITHOUT any binding initially to avoid binding errors
        var oTable = new sap.m.Table({
          width: "100%",
          growing: true,
          growingThreshold: 20,
          visible: false,
          headerToolbar: oToolbar,
          columns: aTableColumns,
          itemPress: this.onChildItemPress.bind(this)
        });

        // CRITICAL: Set model explicitly to view's JSON model to prevent OData binding errors
        // The table will use JSON binding for child data, not OData navigation
        oTable.setModel(oViewModel, "view");

        oTable.data("tabName", oTab.name);
        oTable.data("bindingKey", sCacheKey);
        oTable.data("entitySetName", oTab.entity_set_name);
        oTable.data("fields", JSON.stringify(oTab.fields || []));

        // Store button references for enabling/disabling later
        oTab.editButton = oEditButton;
        oTab.deleteButton = oDeleteButton;

        // Store table reference for showing/hiding
        oTab.tableControl = oTable;

        // Store UI element references in view model for later access
        var oUIElements = {
          countText: oCountText,
          editButton: oEditButton,
          deleteButton: oDeleteButton,
          tableControl: oTable
        };
        oViewModel.setProperty("/childUIElements/" + sCacheKey, oUIElements);

        // Add elements to panel content
        oPanelContent.addItem(oLoadButton);
        oPanelContent.addItem(oCountText);
        oPanelContent.addItem(oTable);

        // Add panel content (Panel uses addContent, not setContent)
        oTabPanel.addContent(oPanelContent);

        // Add panel to container
        oContainer.addItem(oTabPanel);
        console.log("[DEBUG] Panel added to container for:", oTab.name);
        } catch (oError) {
          console.error("[DEBUG] Error creating panel for " + oTab.name + ":", oError);
        }
      }.bind(this));

      var finalItemCount = oContainer.getItems().length;
      console.log("[DEBUG] Finished rendering. Total items in container:", finalItemCount);
    },

    /**
     * Handle Create button press for child records
     */
    onCreateChildRecord: function(oEvent) {
      var oSource = oEvent.getSource();
      var sEntitySetName = oSource.data("entitySetName");
      var sTabName = oSource.data("tabName");
      var sBindingKey = oSource.data("bindingKey");
      var sParentColumnName = oSource.data("parentColumnName");

      // Get fields directly from view model (more reliable than button data)
      var oViewModel = this.getView().getModel("view");
      var aChildTabs = oViewModel.getProperty("/childTabs");
      var oTab = aChildTabs.find(function(t) { return t.name === sTabName; });
      var aFields = oTab ? (oTab.fields || []) : [];

      console.log("=== CREATE BUTTON ===");
      console.log("Tab name:", sTabName);
      console.log("Fields from view model:", aFields.length, "fields");
      console.log("First 3 fields:", aFields.slice(0, 3));

      // Get parent ID
      var sParentId = oViewModel.getProperty("/currentId");

      // Open dialog for creating new record
      this._openChildRecordDialog({
        mode: "create",
        entitySetName: sEntitySetName,
        tabName: sTabName,
        bindingKey: sBindingKey,
        parentColumnName: sParentColumnName,
        parentId: sParentId,
        fields: aFields
      });
    },

    /**
     * Handle Edit button press for child records
     */
    onEditChildRecord: function(oEvent) {
      var oSource = oEvent.getSource();
      var sEntitySetName = oSource.data("entitySetName");
      var sTabName = oSource.data("tabName");
      var sBindingKey = oSource.data("bindingKey");

      // Get fields directly from view model (more reliable than button data)
      var oViewModel = this.getView().getModel("view");
      var aChildTabs = oViewModel.getProperty("/childTabs");
      var oTab = aChildTabs.find(function(t) { return t.name === sTabName; });
      var aFields = oTab ? (oTab.fields || []) : [];

      console.log("=== EDIT BUTTON ===");
      console.log("Tab name:", sTabName);
      console.log("Fields from view model:", aFields.length, "fields");

      // Get first record (simplified - could be enhanced to support multi-select)
      var aData = oViewModel.getProperty("/loadedChildData/" + sBindingKey);

      if (!aData || aData.length === 0) {
        MessageHelper.showWarning("No records to edit");
        return;
      }

      // Edit first record (could be enhanced for selection)
      var oRecord = aData[0];

      console.log("Editing child record:", oRecord.id);
      console.log("Fields for edit:", aFields);

      this._openChildRecordDialog({
        mode: "edit",
        entitySetName: sEntitySetName,
        tabName: sTabName,
        bindingKey: sBindingKey,
        record: oRecord,
        fields: aFields
      });
    },

    /**
     * Handle Delete button press for child records
     */
    onDeleteChildRecord: function(oEvent) {
      var oSource = oEvent.getSource();
      var sEntitySetName = oSource.data("entitySetName");
      var sBindingKey = oSource.data("bindingKey");

      // Get first record (simplified)
      var oViewModel = this.getView().getModel("view");
      var aData = oViewModel.getProperty("/loadedChildData/" + sBindingKey);

      if (!aData || aData.length === 0) {
        MessageHelper.showWarning("No records to delete");
        return;
      }

      var oRecord = aData[0];

      // Confirm deletion
      sap.m.MessageBox.confirm(
        "Are you sure you want to delete this record?",
        {
          title: "Confirm Delete",
          onClose: function(oAction) {
            if (oAction === sap.m.MessageBox.Action.OK) {
              this._deleteChildRecord(sEntitySetName, oRecord.id, sBindingKey);
            }
          }.bind(this)
        }
      );
    },

    /**
     * Handle table item press (navigation to detail or edit)
     */
    onChildItemPress: function(oEvent) {
      // Get the list item that was pressed
      var oListItem = oEvent.getParameter("listItem");

      if (!oListItem) {
        console.error("No list item found in event");
        return;
      }

      // Get binding context from the list item
      var oBindingContext = oListItem.getBindingContext("view");

      if (!oBindingContext) {
        console.error("No binding context found");
        return;
      }

      var oRecord = oBindingContext.getObject();

      console.log("Item pressed:", oRecord);

      // Show record details
      MessageHelper.showInfo("Selected: " + JSON.stringify(oRecord).substring(0, 100) + "...");
    },

    /**
     * Delete a child record via OData
     */
    _deleteChildRecord: function(sEntitySetName, sRecordId, sBindingKey) {
      var oModel = this.getView().getModel();
      var sServiceUrl = oModel.getServiceUrl();

      // Build URL
      var sUrl = sServiceUrl;
      if (sUrl.endsWith('/')) {
        sUrl = sUrl.slice(0, -1);
      }
      sUrl = sUrl + "/" + sEntitySetName + "(" + sRecordId + ")";

      fetch(sUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status + ": " + response.statusText);
        }
        return response.text();
      })
      .then(function() {
        MessageHelper.showSuccess("Record deleted successfully");

        // Reload data
        var oTable = this.getView().byId("childTabsContainer").getItems()[0].getContent()[0].getItems()[2];
        if (oTable) {
          oTable.setVisible(false);
        }

        // Trigger reload
        this.onTabExpand({
          getSource: function() {
            return {
              data: function(key) {
                if (key === "bindingKey") return sBindingKey;
                if (key === "entitySetName") return sEntitySetName.replace("Set", "");
                return null;
              }
            };
          }
        });
      }.bind(this))
      .catch(function(error) {
        console.error("Delete error:", error);
        MessageHelper.showError("Error deleting record: " + error.message);
      });
    },

    /**
     * Open dialog for creating/editing child records
     */
    _openChildRecordDialog: function(oConfig) {
      // Create dialog with form based on field metadata
      var oDialog = new sap.m.Dialog({
        title: oConfig.mode === "create" ? "New " + oConfig.tabName : "Edit " + oConfig.tabName,
        contentWidth: "600px",
        content: [
          this._createChildRecordForm(oConfig)
        ],
        beginButton: new sap.m.Button({
          text: "Save",
          type: "Emphasized",
          press: function() {
            this._saveChildRecord(oConfig, oDialog);
          }.bind(this)
        }),
        endButton: new sap.m.Button({
          text: "Cancel",
          press: function() {
            oDialog.close();
            oDialog.destroy();
          }
        })
      });

      oDialog.open();
    },

    /**
     * Create form based on field metadata
     */
    _createChildRecordForm: function(oConfig) {
      console.log("Creating form with config:", oConfig);
      console.log("Fields:", oConfig.fields);

      var oForm = new sap.ui.layout.form.SimpleForm({
        layout: "ResponsiveGridLayout",
        labelSpanL: 4,
        labelSpanM: 4,
        emptySpanL: 0,
        emptySpanM: 0,
        columnsL: 1,
        columnsM: 1,
        editable: true
      });

      // Get first 8 fields for the form
      var aFormFields = (oConfig.fields || []).slice(0, 8);

      console.log("Form fields to create:", aFormFields.length);

      aFormFields.forEach(function(oField) {
        var sColumnName = oField.column_name;
        var sLabel = oField.column_display_name || oField.field_name || sColumnName;
        var sValue = "";
        var bEditable = sColumnName !== oConfig.parentColumnName;

        // Set value for edit mode
        if (oConfig.mode === "edit" && oConfig.record) {
          sValue = oConfig.record[sColumnName] || "";
        }

        // Set parent ID for create mode
        if (oConfig.mode === "create" && sColumnName === oConfig.parentColumnName) {
          sValue = oConfig.parentId || "";
        }

        // Determine field type and create appropriate control
        var oControl;

        // Boolean fields
        if (sColumnName.includes("is_") || sColumnName === "is_active" || sColumnName === "is_primary") {
          var bBoolValue = (sValue === true || sValue === "true");
          oControl = new sap.m.CheckBox({
            selected: bBoolValue,
            editable: bEditable
          });
          oControl.data("columnName", sColumnName);
          oControl.data("fieldType", "boolean");
        }
        // Date fields
        else if (sColumnName.includes("_date") || sColumnName === "date") {
          var oDateValue = sValue ? new Date(sValue) : null;
          oControl = new sap.m.DatePicker({
            value: oDateValue,
            editable: bEditable,
            displayFormat: "yyyy-MM-dd",
            valueFormat: "yyyy-MM-dd"
          });
          oControl.data("columnName", sColumnName);
          oControl.data("fieldType", "date");
        }
        // Text fields (default)
        else {
          oControl = new sap.m.Input({
            value: sValue,
            editable: bEditable
          });
          oControl.data("columnName", sColumnName);
          oControl.data("fieldType", "string");
        }

        // Add label and control to form
        oForm.addContent(new sap.m.Label({ text: sLabel }));
        oForm.addContent(oControl);
      });

      console.log("Form created successfully with", oForm.getContent().length, "items");
      return oForm;
    },

    /**
     * Save child record (create or update)
     */
    _saveChildRecord: function(oConfig, oDialog) {
      var oForm = oDialog.getContent()[0];
      var aFormContent = oForm.getContent();

      var oData = {};
      var oModel = this.getView().getModel();
      var sServiceUrl = oModel.getServiceUrl();

      console.log("Form content length:", aFormContent.length);

      // Collect form data - SimpleForm has alternating Label/Control pairs
      for (var i = 0; i < aFormContent.length; i++) {
        var oControl = aFormContent[i];

        console.log("Item", i, "type:", oControl.getMetadata().getName(), "has data:", !!oControl.data);

        // Skip labels - only process controls that have our data attributes
        if (oControl && oControl.data && typeof oControl.data === "function") {
          var sColumnName = oControl.data("columnName");
          var sFieldType = oControl.data("fieldType");

          console.log("  columnName:", sColumnName, "fieldType:", sFieldType);

          if (sColumnName) {
            var vValue;

            // Get value based on field type
            if (sFieldType === "boolean") {
              vValue = oControl.getSelected();
              console.log("  boolean value:", vValue);
            } else if (sFieldType === "date") {
              vValue = oControl.getValue();
              console.log("  date value:", vValue);
            } else if (typeof oControl.getValue === "function") {
              vValue = oControl.getValue();
              console.log("  string value:", vValue);
            }

            // Include value (even empty strings for required fields)
            oData[sColumnName] = vValue;
          }
        }
      }

      // Add parent ID for create mode
      if (oConfig.mode === "create" && oConfig.parentColumnName) {
        oData[oConfig.parentColumnName] = oConfig.parentId;
      }

      console.log("Saving data:", JSON.stringify(oData, null, 2));

      // Build URL
      var sUrl = sServiceUrl;
      if (sUrl.endsWith('/')) {
        sUrl = sUrl.slice(0, -1);
      }
      sUrl = sUrl + "/" + oConfig.entitySetName;

      // Add record ID for update mode
      if (oConfig.mode === "edit" && oConfig.record) {
        sUrl = sUrl + "(" + oConfig.record.id + ")";
      }

      var sMethod = oConfig.mode === "create" ? "POST" : "PATCH";

      console.log("===========================================");
      console.log("SAVE OPERATION");
      console.log("URL:", sUrl);
      console.log("Method:", sMethod);
      console.log("Data being sent:", JSON.stringify(oData, null, 2));
      console.log("===========================================");

      fetch(sUrl, {
        method: sMethod,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(oData)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status + ": " + response.statusText);
        }
        return response.json();
      })
      .then(function(oResult) {
        console.log("Save result:", oResult);
        MessageHelper.showSuccess("Record saved successfully");
        oDialog.close();
        oDialog.destroy();

        // Reload data
        this.onTabExpand({
          getSource: function() {
            return {
              data: function(key) {
                if (key === "bindingKey") return oConfig.bindingKey;
                if (key === "entitySetName") return oConfig.entitySetName.replace("Set", "");
                return null;
              }
            };
          }
        });
      }.bind(this))
      .catch(function(error) {
        console.error("Save error:", error);
        MessageHelper.showError("Error saving record: " + error.message);
      });
    },

    _getAllViewIds: function(oView) {
      try {
        var aIds = [];
        var fnGetIds = function(oControl) {
          if (oControl && oControl.getId && oControl.getId()) {
            aIds.push(oControl.getId());
          }
          if (oControl && oControl.getAggregation) {
            var aAggregations = oView.getMetadata().getAllAggregations();
            for (var i = 0; i < aAggregations.length; i++) {
              var sAggName = aAggregations[i].name;
              var aAggContent = oControl.getAggregation(sAggName);
              if (aAggContent) {
                if (Array.isArray(aAggContent)) {
                  aAggContent.forEach(fnGetIds);
                } else {
                  fnGetIds(aAggContent);
                }
              }
            }
          }
        };
        fnGetIds(oView);
        return aIds;
      } catch (e) {
        return ["Error getting IDs: " + e.message];
      }
    },

    _getRouter: function() {
      var oComponent = this.getOwnerComponent();
      if (!oComponent) {
        console.error("Owner component not available in " + this.getMetadata().getName());
        MessageHelper.showWarning("Navigation not available");
        return null;
      }
      return oComponent.getRouter();
    },
  });
});
