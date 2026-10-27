// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import { useSearchParams } from "react-router";
import { isTilArticleSearch } from "../util/tilArticleView";
import TilArticlePage from "./TilArticlePage";
import TilEntryPage from "./TilEntryPage";

// One entry, two ways to read it: inside One WSO2 by default, or as a
// full-page article with ?view=article. AppLayout reads the same parameter
// to drop its shell for the article (see layouts/fullPageRoutes).
export default function TilEntryRoute() {
  const [params] = useSearchParams();
  return isTilArticleSearch(params) ? <TilArticlePage /> : <TilEntryPage />;
}
