from django.urls import path

from .views import SearchView, SearchSuggestionsView

urlpatterns = [
    path('suggestions/', SearchSuggestionsView.as_view(), name='search_suggestions'),
    path('', SearchView.as_view(), name='search'),
]
