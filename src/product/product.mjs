import { render } from '../shell/nav.mjs';

render(document.getElementById('core-nav'), { active: document.getElementById('product-main').dataset.page });
