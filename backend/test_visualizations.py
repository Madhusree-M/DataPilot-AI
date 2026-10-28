import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(__file__))
from app.main import app

client = TestClient(app)

class TestVisualizationAndInsights(unittest.TestCase):
    def test_histogram_student(self):
        res = client.post('/api/eda/StudentPerformanceFactors.csv/chart-data', json={
            'chart_type': 'histogram',
            'x_col': 'Hours_Studied'
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('bins', data['data'])
        self.assertTrue(len(data['data']['bins']) > 0)
        self.assertIn('stats', data['data'])
        self.assertAlmostEqual(data['data']['stats']['mean'], 19.98, places=1)

    def test_boxplot_grouped(self):
        res = client.post('/api/eda/StudentPerformanceFactors.csv/chart-data', json={
            'chart_type': 'boxplot',
            'x_col': 'Exam_Score',
            'group_by_col': 'Parental_Involvement'
        })
        self.assertEqual(res.status_code, 200)
        groups = res.json()['data']['groups']
        self.assertTrue(len(groups) >= 2)
        for g in groups:
            self.assertIn('median', g)
            self.assertIn('q1', g)
            self.assertIn('q3', g)
            self.assertIn('whisker_low', g)
            self.assertIn('whisker_high', g)

    def test_scatter_with_trendline(self):
        res = client.post('/api/eda/StudentPerformanceFactors.csv/chart-data', json={
            'chart_type': 'scatter',
            'x_col': 'Attendance',
            'y_col': 'Exam_Score',
            'sample_size': 500
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['sampled'])
        self.assertLessEqual(len(data['data']['points']), 500)
        t = data['data']['trendline']
        self.assertIsNotNone(t)
        self.assertAlmostEqual(t['pearson_r'], 0.581, places=2)
        self.assertIn('y =', t['equation'])

    def test_correlation_heatmap(self):
        res = client.post('/api/eda/StudentPerformanceFactors.csv/chart-data', json={
            'chart_type': 'correlation_heatmap',
            'x_col': 'dummy'
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('pearson_matrix', data['data'])
        self.assertIn('spearman_matrix', data['data'])
        self.assertEqual(len(data['data']['columns']), len(data['data']['pearson_matrix']))

    def test_bar_chart_aggregated(self):
        res = client.post('/api/eda/StudentPerformanceFactors.csv/chart-data', json={
            'chart_type': 'bar',
            'x_col': 'Parental_Involvement',
            'y_col': 'Exam_Score',
            'aggregation': 'mean'
        })
        self.assertEqual(res.status_code, 200)
        cats = res.json()['data']['categories']
        self.assertTrue(len(cats) > 0)
        self.assertTrue(all('value' in c for c in cats))

    def test_stacked_bar(self):
        res = client.post('/api/eda/StudentPerformanceFactors.csv/chart-data', json={
            'chart_type': 'stacked_bar',
            'x_col': 'Parental_Involvement',
            'group_by_col': 'Access_to_Resources'
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()['data']
        self.assertIn('x_categories', data)
        self.assertIn('groups', data)
        self.assertIn('series', data)

    def test_filters(self):
        res = client.post('/api/eda/StudentPerformanceFactors.csv/chart-data', json={
            'chart_type': 'histogram',
            'x_col': 'Hours_Studied',
            'filters': {'Hours_Studied': {'min': 10, 'max': 25}}
        })
        self.assertEqual(res.status_code, 200)
        stats = res.json()['data']['stats']
        self.assertGreaterEqual(stats['min'], 10)
        self.assertLessEqual(stats['max'], 25)

    def test_insights_student_performance(self):
        res = client.get('/api/eda/StudentPerformanceFactors.csv/insights?target_column=Exam_Score')
        self.assertEqual(res.status_code, 200)
        insights = res.json()['insights']
        self.assertTrue(len(insights) > 0)
        att_insight = next((i for i in insights if i['feature_a'] == 'Attendance' and i['category'] == 'target_driver'), None)
        self.assertIsNotNone(att_insight)
        self.assertEqual(att_insight['severity'], 'high')
        self.assertIn('chart_preset', att_insight)
        self.assertEqual(att_insight['chart_preset']['chart_type'], 'scatter')

    def test_insights_titanic(self):
        res = client.get('/api/eda/titanic.csv/insights?target_column=Survived')
        self.assertEqual(res.status_code, 200)
        insights = res.json()['insights']
        self.assertTrue(len(insights) > 0)

    def test_invalid_chart_column(self):
        res = client.post('/api/eda/StudentPerformanceFactors.csv/chart-data', json={
            'chart_type': 'histogram',
            'x_col': 'non_existent_column_123'
        })
        self.assertEqual(res.status_code, 400)

    def test_top_charts_curation(self):
        res = client.get('/api/eda/StudentPerformanceFactors.csv/top-charts')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data['charts']), 5)
        # Check scatter, histogram, boxplot, bar, heatmap are present
        types = [c['chart_data']['chart_type'] for c in data['charts']]
        self.assertIn('scatter', types)
        self.assertIn('histogram', types)
        self.assertIn('boxplot', types)
        self.assertIn('bar', types)
        self.assertIn('correlation_heatmap', types)

if __name__ == '__main__':
    unittest.main()
