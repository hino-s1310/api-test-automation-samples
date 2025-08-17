#!/usr/bin/env python3
"""
GitHub Actions用カバレッジレポート解析スクリプト
"""

import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def parse_coverage_xml(xml_path: str) -> dict:
    """カバレッジXMLファイルを解析"""
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        line_rate = float(root.get('line-rate', '0'))
        branch_rate = float(root.get('branch-rate', '0'))
        
        coverage_percent = round(line_rate * 100, 1)
        branch_percent = round(branch_rate * 100, 1)
        
        return {
            'line_coverage': coverage_percent,
            'branch_coverage': branch_percent,
            'formatted': f"{coverage_percent}%"
        }
    except Exception as e:
        print(f"Error parsing coverage.xml: {e}", file=sys.stderr)
        return {
            'line_coverage': 0,
            'branch_coverage': 0,
            'formatted': 'N/A'
        }


def parse_test_results(xml_path: str) -> dict:
    """テスト結果XMLファイルを解析"""
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        # pytest JUnitXMLはtestsuitesがルート要素
        total_tests = 0
        total_failures = 0
        total_errors = 0
        total_skipped = 0
        
        # testsuiteの属性を確認
        if root.tag == 'testsuites':
            for testsuite in root.findall('testsuite'):
                total_tests += int(testsuite.get('tests', '0'))
                total_failures += int(testsuite.get('failures', '0'))
                total_errors += int(testsuite.get('errors', '0'))
                total_skipped += int(testsuite.get('skipped', '0'))
        elif root.tag == 'testsuite':
            # 単一のtestsuite
            total_tests = int(root.get('tests', '0'))
            total_failures = int(root.get('failures', '0'))
            total_errors = int(root.get('errors', '0'))
            total_skipped = int(root.get('skipped', '0'))
        
        total_failures_combined = total_failures + total_errors
        passed = total_tests - total_failures_combined - total_skipped
        
        return {
            'total': total_tests,
            'passed': passed,
            'failed': total_failures_combined,
            'skipped': total_skipped,
            'success_rate': round((passed / total_tests * 100), 1) if total_tests > 0 else 0
        }
    except Exception as e:
        print(f"Error parsing test-results.xml: {e}", file=sys.stderr)
        return {
            'total': 0,
            'passed': 0,
            'failed': 0,
            'skipped': 0,
            'success_rate': 0
        }


def generate_summary(coverage_file: str = 'coverage.xml', test_file: str = 'test-results.xml'):
    """サマリーレポートを生成"""
    
    # カバレッジ情報
    if Path(coverage_file).exists():
        coverage = parse_coverage_xml(coverage_file)
        print(f"COVERAGE_PERCENT={coverage['formatted']}")
        print(f"LINE_COVERAGE={coverage['line_coverage']}")
        print(f"BRANCH_COVERAGE={coverage['branch_coverage']}")
    else:
        print("COVERAGE_PERCENT=N/A")
        print("LINE_COVERAGE=0")
        print("BRANCH_COVERAGE=0")
    
    # テスト結果
    if Path(test_file).exists():
        results = parse_test_results(test_file)
        print(f"TOTAL_TESTS={results['total']}")
        print(f"PASSED_TESTS={results['passed']}")
        print(f"FAILED_TESTS={results['failed']}")
        print(f"SKIPPED_TESTS={results['skipped']}")
        print(f"SUCCESS_RATE={results['success_rate']}")
    else:
        print("TOTAL_TESTS=0")
        print("PASSED_TESTS=0")
        print("FAILED_TESTS=0")
        print("SKIPPED_TESTS=0")
        print("SUCCESS_RATE=0")


if __name__ == "__main__":
    coverage_file = sys.argv[1] if len(sys.argv) > 1 else 'coverage.xml'
    test_file = sys.argv[2] if len(sys.argv) > 2 else 'test-results.xml'
    generate_summary(coverage_file, test_file)
