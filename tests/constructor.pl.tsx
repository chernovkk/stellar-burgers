import { test, expect } from '@playwright/test';
import path from 'path';

const mockAccessToken = 'Bearer test-access-token';
const mockRefreshToken = 'test-refresh-token';

test.beforeEach(async ({ context }) => {
  await context.routeFromHAR(path.join(__dirname, 'hars/api.har'), {
    url: '**/api/**'
  });
});

test.describe('Конструктор бургера — добавление ингредиентов', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Тестовая булка')).toBeVisible();
  });

  test('добавление булки в конструктор', async ({ page }) => {
    const constructor = page.getByTestId('constructor')
    const bunCard = page.locator('li', { hasText: 'Тестовая булка' });
    

    await expect(constructor.getByText('Тестовая булка (верх)')).toHaveCount(0);
    await expect(constructor.getByText('Тестовая булка (низ)')).toHaveCount(0);
    await bunCard.getByText('Добавить').click();

    await expect(constructor.getByText('Тестовая булка (верх)')).toBeVisible();
    await expect (constructor.getByText('Тестовая булка (низ)')).toBeVisible();

  });

  test('добавление начинки в конструктор', async ({ page }) => {
    const constructor = page.getByTestId('constructor')
    const mainCard = page.locator('li', { hasText: 'Тестовая начинка' });

    await expect(constructor.getByText('Тестовая начинка')).toHaveCount(0)
    await mainCard.getByText('Добавить').click();
    await expect(constructor.getByText('Тестовая начинка')).toBeVisible()
  });
});

test.describe('Конструктор бургера — модальные окна', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Тестовая булка')).toBeVisible();
  });

  test('открытие модального окна показывает данные именно того ингредиента, по которому кликнули', async ({
    page
  }) => {
    // Клик по булке — модалка должна показать данные булки
    const modal = page.locator('#modals');
    await expect(modal.getByText('Детали ингредиента')).toHaveCount(0);
    await page.getByText('Тестовая булка').click();
    await expect(modal.getByText('Детали ингредиента')).toBeVisible();
    await expect(
      modal.getByRole('heading', { name: 'Тестовая булка' })
    ).toBeVisible();
    await expect(
      modal.getByRole('heading', { name: 'Тестовая начинка' })
    ).not.toBeVisible();

    // Закрываем и кликаем по другому ингредиенту — начинке
    await page.locator('#modals button').click();
    await expect(modal.getByText('Детали ингредиента')).not.toBeVisible();
    await expect(modal.getByText('Детали ингредиента')).toHaveCount(0);
    await page.getByText('Тестовая начинка').click();
    await expect(modal.getByText('Детали ингредиента')).toBeVisible();
    await expect(
      modal.getByRole('heading', { name: 'Тестовая начинка' })
    ).toBeVisible();
    await expect(
      modal.getByRole('heading', { name: 'Тестовая булка' })
    ).not.toBeVisible();
  });

  test('закрытие модального окна по клику на крестик', async ({ page }) => {
    await page.getByText('Тестовая булка').click();
    const modal = page.locator('#modals');
    await expect(modal.getByText('Детали ингредиента')).toBeVisible();

    await page.locator('#modals button').click();

    await expect(modal.getByText('Детали ингредиента')).not.toBeVisible();
  });

  test('закрытие модального окна по клику на оверлей', async ({ page }) => {
    await page.getByText('Тестовая булка').click();
    const modal = page.locator('#modals');
    await expect(modal.getByText('Детали ингредиента')).toBeVisible();

    await page
      .locator('#modals > div')
      .last()
      .click({ position: { x: 5, y: 5 } });

    await expect(modal.getByText('Детали ингредиента')).not.toBeVisible();
  });
});

test.describe('Конструктор бургера — оформление заказа', () => {
  test('создание заказа авторизованным пользователем', async ({
    page,
    context
  }) => {
    await context.addCookies([
      {
        name: 'accessToken',
        value: mockAccessToken,
        url: 'http://localhost:4000'
      }
    ]);
    await page.addInitScript((token) => {
      window.localStorage.setItem('refreshToken', token);
    }, mockRefreshToken);

    await page.goto('/');
    await expect(page.getByText('Тестовая булка')).toBeVisible();

    await expect(page.getByText('Тестовый Пользователь')).toBeVisible();
    const constructor = page.getByTestId('constructor');
    const modal = page.locator('#modals');
    const bunCard = page.locator('li', { hasText: 'Тестовая булка' });

    await bunCard.getByText('Добавить').click();
    const mainCard = page.locator('li', { hasText: 'Тестовая начинка' });
    await mainCard.getByText('Добавить').click();

    

    await expect(constructor.getByText('Тестовая булка (верх)')).toBeVisible()
    await expect(constructor.getByText('Тестовая булка (низ)')).toBeVisible();
    await expect(constructor.getByText('Тестовая начинка')).toBeVisible();

    await expect(modal.getByText('идентификатор заказа')).toHaveCount(0);

    await page.getByRole('button', { name: 'Оформить заказ' }).click();

    await expect(modal.getByText('идентификатор заказа')).toBeVisible();
    await expect(modal.getByText('12345')).toBeVisible();

    await page.locator('#modals button').click();
    await expect(modal.getByText('идентификатор заказа')).not.toBeVisible();

    await expect(constructor.getByText('Выберите булки').first()).toBeVisible();
    await expect(constructor.getByText('Выберите начинку')).toBeVisible();

    await context.clearCookies();
    await page.evaluate(() => window.localStorage.removeItem('refreshToken'));
  });
});
