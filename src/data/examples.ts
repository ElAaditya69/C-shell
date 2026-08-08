export interface CodeExample {
  id: string;
  label: string;
  icon: string;
  description: string;
  filename: string;
  code: string;
}

export const BUILT_IN_EXAMPLES: CodeExample[] = [
  {
    id: "hello-world",
    label: "Hello World",
    icon: "👋",
    description: "Classic first program",
    filename: "hello.c",
    code: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
  },
  {
    id: "fibonacci",
    label: "Fibonacci Sequence",
    icon: "🔢",
    description: "Iterative Fibonacci",
    filename: "fibonacci.c",
    code: `#include <stdio.h>

int main() {
    int n, a = 0, b = 1, next;

    printf("Enter number of terms: ");
    scanf("%d", &n);

    printf("Fibonacci Series: ");
    for (int i = 0; i < n; i++) {
        printf("%d ", a);
        next = a + b;
        a = b;
        b = next;
    }
    printf("\\n");
    return 0;
}
`,
  },
  {
    id: "linked-list",
    label: "Linked List",
    icon: "🔗",
    description: "Singly linked list with insert & print",
    filename: "linked_list.c",
    code: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node* next;
} Node;

Node* createNode(int data) {
    Node* node = (Node*)malloc(sizeof(Node));
    node->data = data;
    node->next = NULL;
    return node;
}

void insertEnd(Node** head, int data) {
    Node* newNode = createNode(data);
    if (*head == NULL) {
        *head = newNode;
        return;
    }
    Node* temp = *head;
    while (temp->next != NULL)
        temp = temp->next;
    temp->next = newNode;
}

void printList(Node* head) {
    Node* temp = head;
    while (temp != NULL) {
        printf("%d -> ", temp->data);
        temp = temp->next;
    }
    printf("NULL\\n");
}

void freeList(Node* head) {
    Node* temp;
    while (head != NULL) {
        temp = head;
        head = head->next;
        free(temp);
    }
}

int main() {
    Node* head = NULL;
    insertEnd(&head, 10);
    insertEnd(&head, 20);
    insertEnd(&head, 30);
    insertEnd(&head, 40);

    printf("Linked List: ");
    printList(head);

    freeList(head);
    return 0;
}
`,
  },
  {
    id: "file-io",
    label: "File I/O",
    icon: "📁",
    description: "Read and write files",
    filename: "file_io.c",
    code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write to file
    FILE* fp = fopen("output.txt", "w");
    if (fp == NULL) {
        perror("Error opening file for writing");
        return 1;
    }
    fprintf(fp, "Hello from C-Shell!\\n");
    fprintf(fp, "Line 2: File I/O demo\\n");
    fclose(fp);
    printf("File written successfully.\\n");

    // Read from file
    fp = fopen("output.txt", "r");
    if (fp == NULL) {
        perror("Error opening file for reading");
        return 1;
    }

    char buffer[256];
    printf("\\nFile contents:\\n");
    while (fgets(buffer, sizeof(buffer), fp) != NULL) {
        printf("  %s", buffer);
    }
    fclose(fp);

    return 0;
}
`,
  },
  {
    id: "sorting",
    label: "Sorting Algorithms",
    icon: "📊",
    description: "Bubble sort & quicksort",
    filename: "sorting.c",
    code: `#include <stdio.h>

void swap(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - i - 1; j++)
            if (arr[j] > arr[j + 1])
                swap(&arr[j], &arr[j + 1]);
}

int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(&arr[i], &arr[j]);
        }
    }
    swap(&arr[i + 1], &arr[high]);
    return i + 1;
}

void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

void printArray(int arr[], int n) {
    for (int i = 0; i < n; i++)
        printf("%d ", arr[i]);
    printf("\\n");
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr) / sizeof(arr[0]);

    printf("Original: ");
    printArray(arr, n);

    quickSort(arr, 0, n - 1);
    printf("Sorted:   ");
    printArray(arr, n);

    return 0;
}
`,
  },
  {
    id: "functions",
    label: "Functions",
    icon: "🧩",
    description: "Prototypes, params, return values & recursion",
    filename: "functions.c",
    code: `#include <stdio.h>

// Function prototypes tell the compiler what's coming.
int add(int a, int b);
int factorial(int n);
double square(double x);
int max(int a, int b);
void printGreeting(char name[]);

int add(int a, int b) {
    return a + b;                    // returns the sum
}

double square(double x) {
    return x * x;                    // returns a double
}

void printGreeting(char name[]) {
    printf("Hello, %s!\\n", name);   // returns nothing (void)
}

int max(int a, int b) {
    return (a > b) ? a : b;
}

// A recursive function: a function that calls itself.
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    char user[] = "Coder";
    printGreeting(user);

    int x = 7, y = 12;
    printf("add(%d, %d) = %d\\n", x, y, add(x, y));
    printf("max(%d, %d) = %d\\n", x, y, max(x, y));
    printf("square(%.1f) = %.1f\\n", 2.5, square(2.5));

    int n = 5;
    printf("factorial(%d) = %d\\n", n, factorial(n));
    return 0;
}
`,
  },
  {
    id: "pointers",
    label: "Pointers & Memory",
    icon: "🧠",
    description: "Pointer basics and dynamic allocation",
    filename: "pointers.c",
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Basic pointers
    int x = 42;
    int* ptr = &x;
    printf("Value: %d, Address: %p\\n", *ptr, (void*)ptr);

    // Dynamic array
    int n = 5;
    int* arr = (int*)malloc(n * sizeof(int));
    if (arr == NULL) {
        perror("malloc failed");
        return 1;
    }

    for (int i = 0; i < n; i++)
        arr[i] = (i + 1) * 10;

    printf("Dynamic array: ");
    for (int i = 0; i < n; i++)
        printf("%d ", arr[i]);
    printf("\\n");

    // Dynamic string
    char* greeting = (char*)malloc(64);
    strcpy(greeting, "Hello from dynamic memory!");
    printf("%s\\n", greeting);

    // Cleanup
    free(arr);
    free(greeting);
    printf("Memory freed successfully.\\n");

    return 0;
}
`,
  },
];

export interface CodeSnippet {
  name: string;
  prefix: string;
  body: string;
  description: string;
}

export const BUILT_IN_SNIPPETS: CodeSnippet[] = [
  {
    name: "Main Function",
    prefix: "main",
    description: "Standard main function",
    body: `int main() {\n    \n    return 0;\n}`,
  },
  {
    name: "Main with Args",
    prefix: "mainargs",
    description: "Main with argc/argv",
    body: `int main(int argc, char* argv[]) {\n    \n    return 0;\n}`,
  },
  {
    name: "For Loop",
    prefix: "for",
    description: "Standard for loop",
    body: `for (int i = 0; i < n; i++) {\n    \n}`,
  },
  {
    name: "While Loop",
    prefix: "while",
    description: "While loop",
    body: `while (condition) {\n    \n}`,
  },
  {
    name: "If-Else",
    prefix: "ifelse",
    description: "If-else block",
    body: `if (condition) {\n    \n} else {\n    \n}`,
  },
  {
    name: "Switch Case",
    prefix: "switch",
    description: "Switch-case block",
    body: `switch (value) {\n    case 1:\n        break;\n    case 2:\n        break;\n    default:\n        break;\n}`,
  },
  {
    name: "Struct Definition",
    prefix: "struct",
    description: "Typedef struct",
    body: `typedef struct {\n    int field;\n} TypeName;`,
  },
  {
    name: "Function Definition",
    prefix: "func",
    description: "Function with return type",
    body: `int functionName(int param) {\n    \n    return 0;\n}`,
  },
  {
    name: "Print Format",
    prefix: "printf",
    description: "Printf statement",
    body: `printf("%d\\n", value);`,
  },
  {
    name: "Scanf Input",
    prefix: "scanf",
    description: "Scanf statement",
    body: `printf("Enter value: ");\nscanf("%d", &value);`,
  },
  {
    name: "File Open",
    prefix: "fopen",
    description: "Open file with error check",
    body: `FILE* fp = fopen("filename.txt", "r");\nif (fp == NULL) {\n    perror("Error opening file");\n    return 1;\n}\n// ... use file ...\nfclose(fp);`,
  },
  {
    name: "Malloc",
    prefix: "malloc",
    description: "Dynamic memory allocation",
    body: `int* ptr = (int*)malloc(n * sizeof(int));\nif (ptr == NULL) {\n    perror("malloc failed");\n    return 1;\n}\n// ... use ptr ...\nfree(ptr);`,
  },
  {
    name: "Header Guard",
    prefix: "guard",
    description: "#ifndef header guard",
    body: `#ifndef HEADER_H\n#define HEADER_H\n\n\n\n#endif /* HEADER_H */`,
  },
  {
    name: "Include stdio",
    prefix: "incstdio",
    description: "#include <stdio.h>",
    body: `#include <stdio.h>`,
  },
  {
    name: "Include stdlib",
    prefix: "incstdlib",
    description: "#include <stdlib.h>",
    body: `#include <stdlib.h>`,
  },
  {
    name: "Include string",
    prefix: "incstring",
    description: "#include <string.h>",
    body: `#include <string.h>`,
  },
];
