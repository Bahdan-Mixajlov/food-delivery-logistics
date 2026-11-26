import { db } from "../config/db.js";

const SORT_MAP = {
  price_asc: "d.price ASC",
  price_desc: "d.price DESC",
  kcal_desc: "d.calories DESC",
};

export const getAllDishes = async (req, res) => {
  const { category, search, sortBy } = req.query;

  let query = `
    SELECT DISTINCT d.id_dish AS id, d.name AS title, d.description, d.price,
           d.calories, d.proteins, d.fats, d.carbs, d.weight, d.id_category,
           d.image_url AS image
      FROM dish d
      JOIN category c ON d.id_category = c.id_category
     WHERE 1 = 1
  `;
  const params = [];

  if (category && category !== "Все") {
    query += " AND c.name = ?";
    params.push(category);
  }

  if (search && String(search).trim()) {
    const pattern = `%${String(search).trim()}%`;
    query += ` AND (
      LOWER(d.name) LIKE LOWER(?)
      OR LOWER(d.description) LIKE LOWER(?)
      OR EXISTS (
        SELECT 1 FROM dish_composition dc
          JOIN ingredient i ON dc.id_ingredient = i.id_ingredient
         WHERE dc.id_dish = d.id_dish AND LOWER(i.name) LIKE LOWER(?)
      )
    )`;
    params.push(pattern, pattern, pattern);
  }

  query += SORT_MAP[sortBy] ? ` ORDER BY ${SORT_MAP[sortBy]}` : " ORDER BY d.id_dish DESC";

  try {
    const [rows] = await db.execute(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error("[getAllDishes]", error);
    res.status(500).json({ message: "Не удалось получить блюда" });
  }
};

export const getDishById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      `SELECT id_dish AS id, name AS title, description, price, calories,
              proteins, fats, carbs, weight, image_url AS image
         FROM dish WHERE id_dish = ?`,
      [id],
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Блюдо не найдено" });
    }
    const [ingredients] = await db.execute(
      `SELECT i.name FROM dish_composition dc
        JOIN ingredient i ON i.id_ingredient = dc.id_ingredient
       WHERE dc.id_dish = ?`,
      [id],
    );
    res.status(200).json({ ...rows[0], ingredients: ingredients.map((row) => row.name) });
  } catch (error) {
    console.error("[getDishById]", error);
    res.status(500).json({ message: "Не удалось получить блюдо" });
  }
};

export const getCategories = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id_category AS id, name FROM category ORDER BY name",
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("[getCategories]", error);
    res.status(500).json({ message: "Не удалось получить категории" });
  }
};
