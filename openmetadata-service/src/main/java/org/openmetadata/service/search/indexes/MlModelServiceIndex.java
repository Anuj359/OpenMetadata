package org.openmetadata.service.search.indexes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.openmetadata.common.utils.CommonUtil;
import org.openmetadata.schema.entity.services.MlModelService;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.SearchIndexUtils;
import org.openmetadata.service.search.models.SearchSuggest;
import org.openmetadata.service.util.JsonUtils;

public class MlModelServiceIndex implements ElasticSearchIndex {

  final MlModelService mlModelService;

  private static final List<String> excludeFields = List.of("changeDescription");

  public MlModelServiceIndex(MlModelService mlModelService) {
    this.mlModelService = mlModelService;
  }

  public Map<String, Object> buildESDoc() {
    if (mlModelService.getOwner() != null) {
      EntityReference owner = mlModelService.getOwner();
      owner.setDisplayName(CommonUtil.nullOrEmpty(owner.getDisplayName()) ? owner.getName() : owner.getDisplayName());
      mlModelService.setOwner(owner);
    }
    Map<String, Object> doc = JsonUtils.getMap(mlModelService);
    SearchIndexUtils.removeNonIndexableFields(doc, excludeFields);
    List<SearchSuggest> suggest = new ArrayList<>();
    suggest.add(SearchSuggest.builder().input(mlModelService.getName()).weight(5).build());
    suggest.add(SearchSuggest.builder().input(mlModelService.getFullyQualifiedName()).weight(5).build());
    doc.put("suggest", suggest);
    doc.put("entityType", Entity.MLMODEL_SERVICE);
    return doc;
  }
}
