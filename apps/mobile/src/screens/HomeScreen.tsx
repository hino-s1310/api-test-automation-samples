import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { PDFUploader } from '../components/PDFUploader';

export const HomeScreen: React.FC = () => {
  const [markdownResult, setMarkdownResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUploadSuccess = (result: any) => {
    setMarkdownResult(result.markdown);
    Alert.alert('成功', 'PDFの変換が完了しました');
  };

  const handleUploadError = (error: string) => {
    Alert.alert('エラー', error);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PDF to Markdown</Text>
        <Text style={styles.subtitle}>PDFファイルをMarkdownに変換</Text>
      </View>

      <PDFUploader
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />

      {markdownResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>変換結果:</Text>
          <Text style={styles.markdownText}>{markdownResult}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  markdownText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    fontFamily: 'monospace',
  },
});
